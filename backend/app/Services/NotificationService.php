<?php

namespace App\Services;

use App\Events\NotificationPushed;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Venue;
use App\Models\VenueFollower;

class NotificationService
{
    public function notify(User $user, string $type, string $title, string $body, array $data = []): void
    {
        $preferences = NotificationPreference::query()->firstOrCreate(['user_id' => $user->id]);
        $column = $this->column($type);

        if ($column && ! $preferences->{$column}) {
            return;
        }

        $notification = UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data ?: null,
        ]);

        try {
            event(new NotificationPushed($notification));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    public function notifyFollowers(Venue $venue, string $type, string $title, string $body, array $data = []): void
    {
        VenueFollower::query()->where('venue_id', $venue->id)->with('user')->each(function (VenueFollower $follower) use ($type, $title, $body, $data) {
            if ($follower->user) {
                $this->notify($follower->user, $type, $title, $body, $data);
            }
        });
    }

    private function column(string $type): ?string
    {
        return match ($type) {
            'NEW_EVENT' => 'new_event',
            'EVENT_UPDATED' => 'event_updated',
            'EVENT_CANCELLED' => 'event_cancelled',
            'NEW_POST' => 'new_post',
            'NEW_PROMOTION' => 'new_promotion',
            'VENUE_ANNOUNCEMENT' => 'venue_announcement',
            'RESERVATION_CONFIRMED' => 'reservation_confirmed',
            'RESERVATION_CANCELLED' => 'reservation_cancelled',
            'RESERVATION_REMINDER' => 'reservation_reminder',
            'ORDER_STATUS_CHANGED' => 'order_status_changed',
            'DELIVERY_STATUS', 'DELIVERY_ARRIVED' => 'delivery_status',
            default => null,
        };
    }
}
