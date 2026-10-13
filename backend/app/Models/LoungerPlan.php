<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoungerPlan extends Model
{
    protected $fillable = ['venue_id', 'canvas_width', 'canvas_height'];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function zones(): HasMany
    {
        return $this->hasMany(LoungerZone::class)->orderBy('sort_order');
    }

    public function loungers(): HasMany
    {
        return $this->hasMany(Lounger::class);
    }
}
