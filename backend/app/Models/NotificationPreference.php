<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $fillable = [
        'user_id', 'new_event', 'event_updated', 'event_cancelled', 'new_post', 'new_promotion',
        'venue_announcement', 'reservation_confirmed', 'reservation_cancelled', 'reservation_reminder',
        'order_status_changed',
    ];

    protected function casts(): array
    {
        return [
            'new_event' => 'boolean',
            'event_updated' => 'boolean',
            'event_cancelled' => 'boolean',
            'new_post' => 'boolean',
            'new_promotion' => 'boolean',
            'venue_announcement' => 'boolean',
            'reservation_confirmed' => 'boolean',
            'reservation_cancelled' => 'boolean',
            'reservation_reminder' => 'boolean',
            'order_status_changed' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
