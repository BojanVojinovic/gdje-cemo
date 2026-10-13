<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lounger;
use App\Models\LoungerPlan;
use App\Models\LoungerQrCode;
use App\Models\LoungerRental;
use App\Models\LoungerZone;
use App\Models\Venue;
use App\Models\VenueStaff;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use App\Support\ContentLocales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoungerController extends Controller
{
    public function show(Request $request, Venue $venue): JsonResponse
    {
        $this->locale($request);
        $actor = $request->user('sanctum');
        $owner = $actor && ($actor->isAdmin() || $actor->managesVenue($venue));
        if (! $venue->offers_loungers && ! $owner) {
            abort(404);
        }

        return ApiResponse::success($this->payload($venue, $owner, $request->query('date')));
    }

    public function enable(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $this->locale($request);
        $data = $request->validate(['enabled' => ['required', 'boolean']]);
        $venue->update(['offers_loungers' => $data['enabled']]);
        if ($data['enabled']) {
            LoungerPlan::query()->firstOrCreate(['venue_id' => $venue->id]);
        }

        return ApiResponse::success(['offers_loungers' => $venue->offers_loungers], __('messages.lounger_option'));
    }

    public function storeZone(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $this->locale($request);
        $plan = $this->plan($venue);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'price' => ['required', 'numeric', 'min:0', 'max:500'],
            'water_meters' => ['required', 'integer', 'min:0', 'max:500'],
        ]);
        $zone = $plan->zones()->create([
            'venue_id' => $venue->id,
            'name' => $data['name'],
            'price_cents' => $this->cents($data['price']),
            'water_meters' => $data['water_meters'],
            'sort_order' => (int) $plan->zones()->max('sort_order') + 1,
        ]);

        return ApiResponse::success($this->zonePayload($zone), __('messages.lounger_zone_saved'), 201);
    }

    public function destroyZone(Request $request, LoungerZone $zone): JsonResponse
    {
        $this->authorize('update', $zone->plan->venue);
        $zone->delete();

        return ApiResponse::success(null, __('messages.lounger_zone_removed'));
    }

    public function storeLounger(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $this->locale($request);
        $plan = $this->plan($venue);
        $count = $plan->loungers()->count() + 1;
        $lounger = $plan->loungers()->create([
            'venue_id' => $venue->id,
            'name' => 'L'.$count,
            'seats' => 1,
            'shape' => 'single',
            'position_x' => 40 + (($count % 8) * 90),
            'position_y' => 40 + (intdiv($count, 8) * 140),
        ]);
        $this->qr($lounger);

        return ApiResponse::success($this->loungerPayload($lounger->load('zone', 'qrCode'), true), __('messages.lounger_saved'), 201);
    }

    public function updateLounger(Request $request, Lounger $lounger): JsonResponse
    {
        $this->authorize('update', $lounger->venue);
        $this->locale($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'zone_id' => ['nullable', 'integer'],
            'seats' => ['required', 'integer', 'min:1', 'max:8'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:500'],
            'shape' => ['required', 'in:single,double'],
            'is_orderable' => ['boolean'],
            'is_active' => ['boolean'],
            'status' => ['nullable', 'in:available,rented,occupied,blocked'],
        ]);
        if (! empty($data['zone_id']) && ! LoungerZone::query()->where('id', $data['zone_id'])->where('venue_id', $lounger->venue_id)->exists()) {
            throw ValidationException::withMessages(['zone_id' => __('messages.lounger_zone_missing')]);
        }
        $lounger->fill([
            'name' => $data['name'],
            'zone_id' => $data['zone_id'] ?: null,
            'seats' => $data['seats'],
            'price_cents' => array_key_exists('price', $data) && $data['price'] !== null && $data['price'] !== '' ? $this->cents($data['price']) : null,
            'shape' => $data['shape'],
            'is_orderable' => $data['is_orderable'] ?? $lounger->is_orderable,
            'is_active' => $data['is_active'] ?? $lounger->is_active,
            'status' => $data['status'] ?? $lounger->status,
        ])->save();

        return ApiResponse::success($this->loungerPayload($lounger->fresh(['zone', 'qrCode']), true), __('messages.lounger_saved'));
    }

    public function layout(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $request->validate([
            'loungers' => ['required', 'array'],
            'loungers.*.id' => ['required', 'integer'],
            'loungers.*.position_x' => ['required', 'numeric'],
            'loungers.*.position_y' => ['required', 'numeric'],
            'loungers.*.width' => ['required', 'numeric'],
            'loungers.*.height' => ['required', 'numeric'],
            'loungers.*.rotation' => ['required', 'numeric'],
        ]);
        foreach ($data['loungers'] as $row) {
            Lounger::query()->where('venue_id', $venue->id)->where('id', $row['id'])->update([
                'position_x' => $row['position_x'],
                'position_y' => $row['position_y'],
                'width' => $row['width'],
                'height' => $row['height'],
                'rotation' => $row['rotation'],
            ]);
        }

        return ApiResponse::success(null, __('messages.lounger_layout'));
    }

    public function destroyLounger(Request $request, Lounger $lounger): JsonResponse
    {
        $this->authorize('update', $lounger->venue);
        $lounger->delete();

        return ApiResponse::success(null, __('messages.lounger_removed'));
    }

    public function regenerateQr(Request $request, Lounger $lounger): JsonResponse
    {
        $this->authorize('update', $lounger->venue);
        LoungerQrCode::query()->where('lounger_id', $lounger->id)->update(['is_active' => false]);
        $code = $this->qr($lounger);

        return ApiResponse::success(['qr_token' => $code->token], __('messages.lounger_qr'));
    }

    public function rentals(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $date = $request->query('date') ?: now()->toDateString();

        return ApiResponse::success($this->rentalRows($venue, $date));
    }

    public function storeRental(Request $request, Venue $venue, NotificationService $notifications): JsonResponse
    {
        $this->guardStaff($request, $venue);
        $this->locale($request);

        return $this->createRental($request, $venue, $notifications, $request->user()->managesVenue($venue) || $request->user()->isAdmin());
    }

    public function guestRental(Request $request, Venue $venue, NotificationService $notifications): JsonResponse
    {
        $this->locale($request);
        if (! $venue->offers_loungers) {
            abort(404);
        }

        return $this->createRental($request, $venue, $notifications, false);
    }

    public function transition(Request $request, LoungerRental $rental): JsonResponse
    {
        $this->guardStaff($request, $rental->venue);
        $this->locale($request);
        $data = $request->validate(['status' => ['required', 'in:active,ended,cancelled']]);
        $rental->update(['status' => $data['status']]);
        $this->refreshLounger($rental->lounger);

        return ApiResponse::success($this->rentalPayload($rental->fresh('lounger')), __('messages.lounger_rental_updated'));
    }

    private function createRental(Request $request, Venue $venue, NotificationService $notifications, bool $staff): JsonResponse
    {
        if (! $venue->offers_loungers) {
            abort(403, __('messages.lounger_off'));
        }
        $actor = $request->user('sanctum');
        $data = $request->validate([
            'lounger_id' => ['required', 'integer'],
            'rental_date' => ['required', 'date', 'after_or_equal:today'],
            'seats' => ['required', 'integer', 'min:1', 'max:8'],
            'guest_name' => [$staff || ! $actor ? 'required' : 'nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:300'],
        ], [
            'guest_name.required' => __('messages.lounger_name'),
        ]);
        $lounger = Lounger::query()->with('zone')->where('venue_id', $venue->id)->where('is_active', true)->find($data['lounger_id']);
        if (! $lounger) {
            throw ValidationException::withMessages(['lounger_id' => __('messages.lounger_missing')]);
        }
        if ($data['seats'] > $lounger->seats) {
            throw ValidationException::withMessages(['seats' => __('messages.lounger_seats')]);
        }
        $taken = LoungerRental::query()
            ->where('lounger_id', $lounger->id)
            ->whereDate('rental_date', $data['rental_date'])
            ->whereIn('status', ['pending', 'active'])
            ->exists();
        if ($taken) {
            throw ValidationException::withMessages(['rental_date' => __('messages.lounger_taken')]);
        }
        $rental = LoungerRental::query()->create([
            'venue_id' => $venue->id,
            'lounger_id' => $lounger->id,
            'user_id' => $actor?->id,
            'guest_name' => ($data['guest_name'] ?? '') ?: ($actor?->name ?? ''),
            'seats' => $data['seats'],
            'rental_date' => $data['rental_date'],
            'price_cents' => $lounger->dayPrice(),
            'status' => $staff ? 'active' : 'pending',
            'notes' => $data['notes'] ?? null,
        ]);
        $this->refreshLounger($lounger);
        if (! $staff) {
            $this->notifyBeach($venue, $notifications, $rental);
        }

        return ApiResponse::success($this->rentalPayload($rental->load('lounger')), __('messages.lounger_rental_saved'), 201);
    }

    private function notifyBeach(Venue $venue, NotificationService $notifications, LoungerRental $rental): void
    {
        $staff = VenueStaff::query()->where('venue_id', $venue->id)->with('user')->get();
        foreach ($staff as $row) {
            if ($row->hasRole('beach') && $row->user) {
                $notifications->notify($row->user, 'LOUNGER_RENTAL', __('messages.lounger_rental_title'), $venue->name.' · '.$rental->guest_name, [
                    'venue_id' => $venue->id,
                    'rental_id' => $rental->id,
                ]);
            }
        }
    }

    private function refreshLounger(Lounger $lounger): void
    {
        $today = now()->toDateString();
        $active = LoungerRental::query()->where('lounger_id', $lounger->id)->whereDate('rental_date', $today)->where('status', 'active')->exists();
        if ($lounger->status === 'blocked') {
            return;
        }
        $lounger->update(['status' => $active ? 'rented' : 'available']);
    }

    private function plan(Venue $venue): LoungerPlan
    {
        if (! $venue->offers_loungers) {
            abort(403, __('messages.lounger_off'));
        }

        return LoungerPlan::query()->firstOrCreate(['venue_id' => $venue->id]);
    }

    private function qr(Lounger $lounger): LoungerQrCode
    {
        return LoungerQrCode::query()->create([
            'lounger_id' => $lounger->id,
            'token' => Str::random(40),
            'is_active' => true,
        ]);
    }

    private function guardStaff(Request $request, Venue $venue): void
    {
        $user = $request->user();
        if ($user->isAdmin() || $user->managesVenue($venue)) {
            return;
        }
        $row = VenueStaff::query()->where('user_id', $user->id)->where('venue_id', $venue->id)->first();
        if ($row?->hasRole('beach')) {
            return;
        }
        abort(403);
    }

    private function payload(Venue $venue, bool $owner, ?string $date): array
    {
        $plan = LoungerPlan::query()->with(['zones', 'loungers.zone', 'loungers.qrCode'])->where('venue_id', $venue->id)->first();
        $day = $date ?: now()->toDateString();
        $busy = LoungerRental::query()
            ->where('venue_id', $venue->id)
            ->whereDate('rental_date', $day)
            ->whereIn('status', ['pending', 'active'])
            ->pluck('lounger_id');

        return [
            'enabled' => (bool) $venue->offers_loungers,
            'date' => $day,
            'canvas_width' => $plan?->canvas_width ?? 960,
            'canvas_height' => $plan?->canvas_height ?? 640,
            'zones' => ($plan?->zones ?? collect())->map(fn (LoungerZone $zone) => $this->zonePayload($zone))->values(),
            'loungers' => ($plan?->loungers ?? collect())->map(function (Lounger $lounger) use ($owner, $busy) {
                $row = $this->loungerPayload($lounger, $owner);
                $row['free'] = ! $busy->contains($lounger->id);
                return $row;
            })->values(),
            'rentals' => $owner ? $this->rentalRows($venue, $day) : [],
        ];
    }

    private function rentalRows(Venue $venue, string $date)
    {
        return LoungerRental::query()
            ->with('lounger:id,name,seats')
            ->where('venue_id', $venue->id)
            ->whereDate('rental_date', $date)
            ->latest()
            ->get()
            ->map(fn (LoungerRental $rental) => $this->rentalPayload($rental))
            ->values();
    }

    private function zonePayload(LoungerZone $zone): array
    {
        return [
            'id' => $zone->id,
            'name' => $zone->name,
            'color' => $zone->color,
            'price' => round($zone->price_cents / 100, 2),
            'water_meters' => $zone->water_meters,
        ];
    }

    private function loungerPayload(Lounger $lounger, bool $owner): array
    {
        return [
            'id' => $lounger->id,
            'name' => $lounger->name,
            'zone_id' => $lounger->zone_id,
            'zone' => $lounger->zone?->name,
            'seats' => $lounger->seats,
            'price' => round($lounger->dayPrice() / 100, 2),
            'own_price' => $lounger->price_cents !== null ? round($lounger->price_cents / 100, 2) : null,
            'water_meters' => $lounger->zone?->water_meters,
            'shape' => $lounger->shape,
            'position_x' => (float) $lounger->position_x,
            'position_y' => (float) $lounger->position_y,
            'width' => (float) $lounger->width,
            'height' => (float) $lounger->height,
            'rotation' => (float) $lounger->rotation,
            'status' => $owner ? $lounger->status : ($lounger->is_active ? 'available' : 'blocked'),
            'is_orderable' => $lounger->is_orderable,
            'is_active' => $lounger->is_active,
            'qr_token' => $owner ? $lounger->qrCode?->token : null,
        ];
    }

    private function rentalPayload(LoungerRental $rental): array
    {
        return [
            'id' => $rental->id,
            'lounger_id' => $rental->lounger_id,
            'lounger' => $rental->lounger?->name,
            'guest_name' => $rental->guest_name,
            'seats' => $rental->seats,
            'rental_date' => $rental->rental_date?->toDateString(),
            'price' => round($rental->price_cents / 100, 2),
            'status' => $rental->status,
            'notes' => $rental->notes,
        ];
    }

    private function cents(mixed $price): int
    {
        return (int) round(((float) $price) * 100);
    }

    private function locale(Request $request): void
    {
        $locale = ContentLocales::fromRequest($request);
        if (in_array($locale, ['en', 'cnr', 'ru', 'it', 'de', 'fr', 'es'], true)) {
            app()->setLocale($locale);
        }
    }
}
