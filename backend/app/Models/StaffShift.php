<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffShift extends Model
{
    protected $fillable = [
        'venue_id', 'user_id', 'covered_by_user_id', 'role', 'starts_at', 'ends_at', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
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

    public function covering(): BelongsTo
    {
        return $this->belongsTo(User::class, 'covered_by_user_id');
    }

    public function swaps(): HasMany
    {
        return $this->hasMany(ShiftSwap::class);
    }

    public function workingUserId(): int
    {
        return (int) ($this->covered_by_user_id ?: $this->user_id);
    }
}
