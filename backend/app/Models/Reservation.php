<?php

namespace App\Models;

use App\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    protected $fillable = [
        'venue_id', 'venue_table_id', 'table_combination_id', 'user_id', 'table_ids', 'party_size',
        'start_at', 'end_at', 'status', 'source', 'notes', 'guest_name', 'guest_phone',
        'table_name_snapshot', 'zone_name_snapshot', 'capacity_snapshot', 'seated_at',
    ];

    protected function casts(): array
    {
        return [
            'table_ids' => 'array',
            'party_size' => 'integer',
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'seated_at' => 'datetime',
            'status' => ReservationStatus::class,
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(VenueTable::class, 'venue_table_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function history(): HasMany
    {
        return $this->hasMany(ReservationStatusHistory::class);
    }

    public function session(): HasMany
    {
        return $this->hasMany(DiningSession::class);
    }
}
