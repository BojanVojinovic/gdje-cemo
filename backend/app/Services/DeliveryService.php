<?php

namespace App\Services;

use App\Mail\DeliveryArrivedMail;
use App\Models\DeliveryOrder;
use App\Models\MenuItem;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueStaff;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class DeliveryService
{
    public const STATUSES = ['received', 'preparing', 'in_transit', 'arrived', 'delivered', 'cancelled'];

    public function __construct(private readonly NotificationService $notifications)
    {
    }

    public function place(User $user, Venue $venue, array $data): DeliveryOrder
    {
        if (! $venue->offers_delivery) {
            throw ValidationException::withMessages(['venue' => trans('messages.delivery_off', [], $this->locale($user))]);
        }

        $order = DB::transaction(function () use ($user, $venue, $data) {
            $minutes = (int) ($data['eta_minutes'] ?? $venue->delivery_eta_minutes ?? 0);
            if ($minutes < 5) {
                $minutes = (int) ($venue->delivery_eta_minutes ?: 30);
            }
            $order = DeliveryOrder::query()->create([
                'user_id' => $user->id,
                'venue_id' => $venue->id,
                'status' => 'received',
                'address' => $data['address'],
                'city' => $data['city'],
                'phone' => $data['phone'],
                'notes' => $data['notes'] ?? null,
                'eta_minutes' => $minutes,
                'eta_at' => now()->addMinutes($minutes),
                'total' => 0,
            ]);
            $total = 0;
            foreach ($data['items'] as $row) {
                $item = MenuItem::query()
                    ->with('category')
                    ->whereHas('category.menu', fn ($menu) => $menu->where('venue_id', $venue->id))
                    ->find($row['menu_item_id']);
                if (! $item || ! $item->is_available) {
                    throw ValidationException::withMessages(['items' => 'Item is not available.']);
                }
                $station = $item->category?->station === 'bar' ? 'bar' : 'kitchen';
                $order->items()->create([
                    'menu_item_id' => $item->id,
                    'name_snapshot' => $item->name,
                    'price_snapshot' => $item->price,
                    'quantity' => $row['quantity'],
                    'station' => $station,
                ]);
                $total += (float) $item->price * (int) $row['quantity'];
            }
            $order->update(['total' => $total]);

            return $order->load('items', 'venue');
        });

        $this->notifyCustomer($order, 'received');
        $this->notifyStaff($order);

        return $order;
    }

    public function update(DeliveryOrder $order, string $status, ?int $etaMinutes, User $actor): DeliveryOrder
    {
        $order->loadMissing('venue.business', 'items', 'user');
        if (! $this->canManage($actor, $order, $status)) {
            abort(403, 'You cannot update this delivery.');
        }

        $payload = ['status' => $status];
        if ($etaMinutes) {
            $payload['eta_minutes'] = $etaMinutes;
            $payload['eta_at'] = now()->addMinutes($etaMinutes);
        }
        if ($status === 'arrived') {
            $payload['arrived_at'] = now();
        }
        if ($status === 'delivered') {
            $payload['delivered_at'] = now();
        }
        $order->update($payload);
        $order = $order->fresh(['items', 'venue', 'user']);
        $this->notifyCustomer($order, $status);

        return $order;
    }

    public function canManage(User $actor, DeliveryOrder $order, ?string $status = null): bool
    {
        if ($actor->managesVenue($order->venue)) {
            return true;
        }
        $assignment = VenueStaff::query()
            ->where('user_id', $actor->id)
            ->where('venue_id', $order->venue_id)
            ->first();
        if (! $assignment) {
            return false;
        }
        if ($assignment->hasRole('delivery')) {
            return true;
        }
        $stations = array_values(array_intersect($assignment->roles ?? [], ['kitchen', 'bar']));
        $order->loadMissing('items');
        $prepares = $order->items->contains(fn ($item) => in_array($item->station, $stations, true));
        if (! $prepares) {
            return false;
        }

        return $status === null || $status === 'preparing';
    }

    public function payload(DeliveryOrder $order): array
    {
        $order->loadMissing('items', 'venue:id,name,slug', 'user:id,first_name,last_name,phone');

        return [
            'id' => $order->id,
            'status' => $order->status,
            'address' => $order->address,
            'city' => $order->city,
            'phone' => $order->phone,
            'notes' => $order->notes,
            'eta_minutes' => $order->eta_minutes,
            'eta_at' => $order->eta_at?->toIso8601String(),
            'total' => (float) $order->total,
            'created_at' => $order->created_at?->toIso8601String(),
            'venue' => $order->venue ? [
                'id' => $order->venue->id,
                'name' => $order->venue->name,
                'slug' => $order->venue->slug,
            ] : null,
            'customer' => $order->user ? trim($order->user->first_name.' '.$order->user->last_name) : null,
            'items' => $order->items->map(fn ($item) => [
                'name' => $item->name_snapshot,
                'quantity' => $item->quantity,
                'price' => (float) $item->price_snapshot,
                'station' => $item->station,
            ])->values(),
        ];
    }

    private function notifyCustomer(DeliveryOrder $order, string $status): void
    {
        $user = $order->user;
        if (! $user) {
            return;
        }
        $locale = $this->locale($user);
        $type = $status === 'arrived' ? 'DELIVERY_ARRIVED' : 'DELIVERY_STATUS';
        $key = match ($status) {
            'preparing' => 'delivery_preparing',
            'in_transit' => 'delivery_in_transit',
            'arrived' => 'delivery_arrived',
            'delivered' => 'delivery_delivered',
            'cancelled' => 'delivery_cancelled',
            default => 'delivery_received',
        };
        $body = $status === 'arrived'
            ? trans('messages.delivery_arrived_body', ['venue' => $order->venue?->name], $locale)
            : trans('messages.delivery_status_body', ['venue' => $order->venue?->name, 'minutes' => $order->eta_minutes], $locale);

        $this->notifications->notify($user, $type, trans('messages.'.$key, [], $locale), $body, [
            'delivery_id' => $order->id,
            'status' => $status,
            'venue' => $order->venue?->name,
            'venue_slug' => $order->venue?->slug,
            'eta_minutes' => $order->eta_minutes,
            'address' => $order->address,
        ]);

        if ($status === 'arrived') {
            Mail::to($user->email)->send(new DeliveryArrivedMail($locale, (string) $order->venue?->name, $order->address.', '.$order->city));
        }
    }

    private function notifyStaff(DeliveryOrder $order): void
    {
        $order->loadMissing('venue.business', 'items', 'user');
        $stations = $order->items->pluck('station')->unique()->all();
        $assignments = VenueStaff::query()->where('venue_id', $order->venue_id)->get();
        $ids = [];
        foreach ($assignments as $row) {
            if ($row->hasRole('delivery') || array_intersect($row->roles ?? [], $stations)) {
                $ids[] = $row->user_id;
            }
        }
        if ($ids === [] && $order->venue?->business?->owner_id) {
            $ids[] = $order->venue->business->owner_id;
        }
        $name = trim(($order->user->first_name ?? '').' '.($order->user->last_name ?? ''));
        User::query()->whereIn('id', array_unique($ids))->get()->each(function (User $user) use ($order, $name) {
            $locale = $this->locale($user);
            $this->notifications->notify($user, 'DELIVERY_NEW', trans('messages.delivery_new_title', [], $locale), trans('messages.delivery_new_body', [
                'name' => $name,
                'address' => $order->address,
            ], $locale), [
                'delivery_id' => $order->id,
                'venue_id' => $order->venue_id,
                'status' => $order->status,
            ]);
        });
    }

    private function locale(User $user): string
    {
        return $user->locale === 'cnr' ? 'cnr' : 'en';
    }
}
