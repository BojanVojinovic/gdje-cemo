<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueReservationSetting extends Model
{
    protected $fillable = [
        'venue_id', 'enabled', 'min_advance_minutes', 'max_advance_days', 'duration_minutes', 'buffer_minutes',
        'min_party_size', 'max_party_size', 'cancellation_deadline_minutes', 'auto_confirm', 'allow_table_selection',
        'auto_assign', 'allow_larger_tables', 'waitlist_enabled', 'reminder_hours',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'auto_confirm' => 'boolean',
            'allow_table_selection' => 'boolean',
            'auto_assign' => 'boolean',
            'allow_larger_tables' => 'boolean',
            'waitlist_enabled' => 'boolean',
            'reminder_hours' => 'array',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }
}
