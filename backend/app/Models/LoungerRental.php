<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoungerRental extends Model
{
    protected $fillable = [
        'venue_id', 'lounger_id', 'user_id', 'guest_name', 'guest_phone', 'seats',
        'rental_date', 'price_cents', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'seats' => 'integer',
            'price_cents' => 'integer',
            'rental_date' => 'date',
        ];
    }

    public function lounger(): BelongsTo
    {
        return $this->belongsTo(Lounger::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }
}
