<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiningSession extends Model
{
    protected $fillable = [
        'venue_id', 'venue_table_id', 'reservation_id', 'user_id', 'party_size', 'status',
        'table_name_snapshot', 'zone_name_snapshot', 'opened_at', 'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
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

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
