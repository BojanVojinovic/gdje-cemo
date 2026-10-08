<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryOrder;
use App\Models\Venue;
use App\Services\DeliveryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function store(Request $request, Venue $venue, DeliveryService $deliveries): JsonResponse
    {
        $this->authorize('view', $venue);
        $data = $request->validate([
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:10'],
            'items.*.menu_item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:8'],
        ]);

        $order = $deliveries->place($request->user(), $venue, $data);

        return ApiResponse::success($deliveries->payload($order), trans('messages.delivery_saved', [], $this->locale($request)), 201);
    }

    public function mine(Request $request, DeliveryService $deliveries): JsonResponse
    {
        $rows = DeliveryOrder::query()
            ->with('items', 'venue:id,name,slug')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn (DeliveryOrder $order) => $deliveries->payload($order));

        return ApiResponse::success($rows);
    }

    public function show(Request $request, DeliveryOrder $deliveryOrder, DeliveryService $deliveries): JsonResponse
    {
        if ($deliveryOrder->user_id !== $request->user()->id && ! $deliveries->canManage($request->user(), $deliveryOrder)) {
            abort(403);
        }

        return ApiResponse::success($deliveries->payload($deliveryOrder));
    }

    public function forVenue(Request $request, Venue $venue, DeliveryService $deliveries): JsonResponse
    {
        $this->authorize('update', $venue);
        $rows = DeliveryOrder::query()
            ->with('items', 'venue:id,name,slug', 'user:id,first_name,last_name,phone')
            ->where('venue_id', $venue->id)
            ->whereNotIn('status', ['delivered', 'cancelled'])
            ->latest()
            ->limit(40)
            ->get()
            ->map(fn (DeliveryOrder $order) => $deliveries->payload($order));

        return ApiResponse::success($rows);
    }

    public function update(Request $request, DeliveryOrder $deliveryOrder, DeliveryService $deliveries): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', DeliveryService::STATUSES)],
            'eta_minutes' => ['nullable', 'integer', 'min:5', 'max:180'],
        ]);
        $order = $deliveries->update($deliveryOrder, $data['status'], isset($data['eta_minutes']) ? (int) $data['eta_minutes'] : null, $request->user());

        return ApiResponse::success($deliveries->payload($order), trans('messages.delivery_updated', [], $this->locale($request)));
    }

    private function locale(Request $request): string
    {
        return \App\Support\ContentLocales::fromRequest($request);
    }
}
