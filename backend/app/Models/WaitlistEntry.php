<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaitlistEntry extends Model
{
    protected $fillable = [
        'venue_id', 'user_id', 'party_size', 'preferred_start', 'flexibility_minutes', 'status', 'notified_at',
    ];

    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'preferred_start' => 'datetime',
            'notified_at' => 'datetime',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
