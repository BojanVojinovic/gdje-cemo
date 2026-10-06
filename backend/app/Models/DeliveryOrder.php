<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryOrder extends Model
{
    protected $fillable = [
        'user_id', 'venue_id', 'status', 'address', 'city', 'phone', 'notes',
        'eta_minutes', 'eta_at', 'total', 'arrived_at', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'eta_at' => 'datetime',
            'arrived_at' => 'datetime',
            'delivered_at' => 'datetime',
            'total' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DeliveryOrderItem::class);
    }
}
