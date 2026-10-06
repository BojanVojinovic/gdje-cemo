<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\TableServiceRequest;
use App\Models\VenueStaff;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function board(Request $request): JsonResponse
    {
        $assignments = VenueStaff::query()
            ->with('venue:id,name,slug')
            ->where('user_id', $request->user()->id)
            ->get();
        $venueIds = $assignments->pluck('venue_id');
        $orders = Order::query()
            ->with('items')
            ->whereIn('venue_id', $venueIds)
            ->whereHas('session', fn ($session) => $session->where('status', 'active'))
            ->latest()
            ->limit(60)
            ->get()
            ->groupBy('venue_id');
        $requests = TableServiceRequest::query()
            ->with('session:id,table_name_snapshot')
            ->whereIn('venue_id', $venueIds)
            ->where('status', 'open')
            ->latest()
            ->limit(40)
            ->get()
            ->groupBy('venue_id');

        $venues = $assignments->map(function (VenueStaff $assignment) use ($orders, $requests) {
            $roles = $assignment->roles ?? [];
            $seesAll = in_array('waiter', $roles, true);
            $stations = array_values(array_intersect($roles, ['kitchen', 'bar']));
            $venueOrders = ($orders->get($assignment->venue_id) ?? collect())->map(function (Order $order) use ($seesAll, $stations) {
                $items = $order->items->filter(function ($item) use ($seesAll, $stations) {
                    if ($seesAll) {
                        return true;
                    }

                    return in_array($item->station, $stations, true);
                })->values();
                if ($items->isEmpty()) {
                    return null;
                }

                return [
                    'id' => $order->id,
                    'status' => $order->status,
                    'notes' => $order->notes,
                    'table' => $order->table_name_snapshot,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'items' => $items->map(fn ($item) => [
                        'name' => $item->name_snapshot,
                        'quantity' => $item->quantity,
                        'station' => $item->station,
                    ])->values(),
                ];
            })->filter()->values();

            return [
                'id' => $assignment->venue_id,
                'name' => $assignment->venue?->name,
                'slug' => $assignment->venue?->slug,
                'roles' => $roles,
                'orders' => $venueOrders,
                'requests' => $seesAll
                    ? ($requests->get($assignment->venue_id) ?? collect())->map(fn (TableServiceRequest $row) => [
                        'id' => $row->id,
                        'type' => $row->type,
                        'table' => $row->session?->table_name_snapshot,
                        'created_at' => $row->created_at?->toIso8601String(),
                    ])->values()
                    : [],
            ];
        })->values();

        return ApiResponse::success(['venues' => $venues]);
    }

    public function updateOrder(Request $request, Order $order, NotificationService $notifications, AuditService $audit): JsonResponse
    {
        $assignment = VenueStaff::query()
            ->where('user_id', $request->user()->id)
            ->where('venue_id', $order->venue_id)
            ->first();
        $manager = $request->user()->managesVenue($order->venue);
        if (! $assignment && ! $manager) {
            abort(403, 'Nemate dozvolu za ovu narudžbinu.');
        }

        $roles = $assignment->roles ?? [];
        if (! $manager && ! in_array('waiter', $roles, true)) {
            $order->loadMissing('items');
            $stations = array_values(array_intersect($roles, ['kitchen', 'bar']));
            $touches = $order->items->contains(fn ($item) => in_array($item->station, $stations, true));
            if (! $touches) {
                abort(403, 'Ova narudžbina nije za tvoju stanicu.');
            }
        }

        $data = $request->validate(['status' => ['required', 'in:pending,confirmed,preparing,served,cancelled']]);
        $order->update(['status' => $data['status']]);
        $audit->record($request->user(), 'order.status', $order, $data);
        if ($order->user) {
            $notifications->notify($order->user, 'ORDER_STATUS_CHANGED', 'Narudžbina', 'Status je '.$data['status'].'.', ['order_id' => $order->id]);
        }

        return ApiResponse::success($order->fresh('items'), 'Narudžbina je ažurirana.');
    }

    public function completeRequest(Request $request, TableServiceRequest $tableServiceRequest): JsonResponse
    {
        $assignment = VenueStaff::query()
            ->where('user_id', $request->user()->id)
            ->where('venue_id', $tableServiceRequest->venue_id)
            ->first();
        $waiter = $assignment?->hasRole('waiter') ?? false;
        if (! $waiter && ! $request->user()->managesVenue($tableServiceRequest->venue)) {
            abort(403, 'Samo konobar može zatvoriti ovaj poziv.');
        }

        $tableServiceRequest->update([
            'status' => 'done',
            'handled_by' => $request->user()->id,
            'handled_at' => now(),
        ]);

        return ApiResponse::success(null, 'Poziv je zatvoren.');
    }
}
