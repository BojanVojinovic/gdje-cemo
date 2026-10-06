<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryOrderItem extends Model
{
    protected $fillable = [
        'delivery_order_id', 'menu_item_id', 'name_snapshot', 'price_snapshot', 'quantity', 'station',
    ];

    protected function casts(): array
    {
        return ['price_snapshot' => 'decimal:2'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(DeliveryOrder::class, 'delivery_order_id');
    }
}
