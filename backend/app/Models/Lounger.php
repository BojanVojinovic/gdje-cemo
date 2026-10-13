<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lounger extends Model
{
    protected $fillable = [
        'venue_id', 'lounger_plan_id', 'zone_id', 'name', 'seats', 'price_cents', 'shape',
        'position_x', 'position_y', 'width', 'height', 'rotation', 'status', 'is_orderable', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'seats' => 'integer',
            'price_cents' => 'integer',
            'is_orderable' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(LoungerZone::class, 'zone_id');
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function qrCode(): HasOne
    {
        return $this->hasOne(LoungerQrCode::class)->where('is_active', true);
    }

    public function rentals(): HasMany
    {
        return $this->hasMany(LoungerRental::class);
    }

    public function dayPrice(): int
    {
        return $this->price_cents ?? (int) ($this->zone?->price_cents ?? 0);
    }
}
