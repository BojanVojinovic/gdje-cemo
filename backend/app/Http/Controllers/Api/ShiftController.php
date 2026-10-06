<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftSwap;
use App\Models\StaffShift;
use App\Models\Venue;
use App\Services\ShiftService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function forVenue(Request $request, Venue $venue, ShiftService $shifts): JsonResponse
    {
        $this->authorize('update', $venue);
        $rows = $this->range($request, StaffShift::query()->where('venue_id', $venue->id))->get();

        return ApiResponse::success([
            'shifts' => $rows->map(fn (StaffShift $shift) => $shifts->payload($shift))->values(),
            'colleagues' => $shifts->colleagues($venue, 0),
        ]);
    }

    public function store(Request $request, Venue $venue, ShiftService $shifts): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'role' => ['nullable', 'in:waiter,bar,kitchen'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        $shift = $shifts->create($venue, $data);

        return ApiResponse::success($shifts->payload($shift), 'Shift saved.', 201);
    }

    public function update(Request $request, StaffShift $staffShift, ShiftService $shifts): JsonResponse
    {
        $this->authorize('update', $staffShift->venue);
        $data = $request->validate([
            'user_id' => ['sometimes', 'integer'],
            'role' => ['nullable', 'in:waiter,bar,kitchen'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        return ApiResponse::success($shifts->payload($shifts->update($staffShift, $data)), 'Shift updated.');
    }

    public function destroy(StaffShift $staffShift, ShiftService $shifts): JsonResponse
    {
        $this->authorize('update', $staffShift->venue);
        $shifts->cancel($staffShift);

        return ApiResponse::success(null, 'Shift cancelled.');
    }

    public function mine(Request $request, ShiftService $shifts): JsonResponse
    {
        $user = $request->user();
        $rows = $this->range($request, StaffShift::query()->where('status', 'scheduled')->where(function ($query) use ($user) {
            $query->where('user_id', $user->id)->orWhere('covered_by_user_id', $user->id);
        }))->get();

        $incoming = ShiftSwap::query()->with('shift.venue', 'shift.user', 'shift.covering', 'fromUser', 'toUser')
            ->where('to_user_id', $user->id)->where('status', 'pending')->latest()->get();
        $outgoing = ShiftSwap::query()->with('shift.venue', 'shift.user', 'shift.covering', 'fromUser', 'toUser')
            ->where('from_user_id', $user->id)->where('status', 'pending')->latest()->get();

        return ApiResponse::success([
            'shifts' => $rows->map(function (StaffShift $shift) use ($shifts, $user) {
                $payload = $shifts->payload($shift);
                $payload['colleagues'] = $shifts->colleagues($shift->venue, $user->id);

                return $payload;
            })->values(),
            'incoming' => $incoming->map(fn (ShiftSwap $swap) => $this->swapPayload($swap, $shifts))->values(),
            'outgoing' => $outgoing->map(fn (ShiftSwap $swap) => $this->swapPayload($swap, $shifts))->values(),
        ]);
    }

    public function requestSwap(Request $request, StaffShift $staffShift, ShiftService $shifts): JsonResponse
    {
        $data = $request->validate([
            'to_user_id' => ['required', 'integer'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        $swap = $shifts->requestSwap($staffShift, $request->user(), (int) $data['to_user_id'], $data['note'] ?? null);

        return ApiResponse::success($this->swapPayload($swap, $shifts), 'Swap requested.', 201);
    }

    public function accept(Request $request, ShiftSwap $shiftSwap, ShiftService $shifts): JsonResponse
    {
        $shift = $shifts->accept($shiftSwap, $request->user());

        return ApiResponse::success($shifts->payload($shift), 'Swap accepted.');
    }

    public function decline(Request $request, ShiftSwap $shiftSwap, ShiftService $shifts): JsonResponse
    {
        $shifts->decline($shiftSwap, $request->user());

        return ApiResponse::success(null, 'Swap declined.');
    }

    public function cancelSwap(Request $request, ShiftSwap $shiftSwap, ShiftService $shifts): JsonResponse
    {
        $shifts->cancelSwap($shiftSwap, $request->user());

        return ApiResponse::success(null, 'Swap cancelled.');
    }

    private function range(Request $request, $query)
    {
        $from = $request->query('from', now()->startOfWeek()->toDateString());
        $to = $request->query('to', now()->addDays(21)->toDateString());

        return $query->with('user', 'covering', 'venue', 'swaps.fromUser', 'swaps.toUser')
            ->where('starts_at', '<', $to.' 23:59:59')
            ->where('ends_at', '>', $from.' 00:00:00')
            ->orderBy('starts_at');
    }

    private function swapPayload(ShiftSwap $swap, ShiftService $shifts): array
    {
        $swap->loadMissing('shift.user', 'shift.covering', 'shift.venue', 'fromUser', 'toUser');

        return [
            'id' => $swap->id,
            'status' => $swap->status,
            'note' => $swap->note,
            'from' => $swap->fromUser ? ['id' => $swap->fromUser->id, 'name' => $swap->fromUser->name] : null,
            'to' => $swap->toUser ? ['id' => $swap->toUser->id, 'name' => $swap->toUser->name] : null,
            'shift' => $swap->shift ? $shifts->payload($swap->shift) : null,
        ];
    }
}
