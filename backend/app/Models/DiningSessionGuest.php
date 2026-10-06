<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiningSessionGuest extends Model
{
    protected $fillable = ['dining_session_id', 'token_hash', 'last_waiter_at', 'last_bill_at'];

    protected function casts(): array
    {
        return [
            'last_waiter_at' => 'datetime',
            'last_bill_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DiningSession::class, 'dining_session_id');
    }
}
