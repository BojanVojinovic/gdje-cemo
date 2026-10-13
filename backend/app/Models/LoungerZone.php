<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoungerZone extends Model
{
    protected $fillable = ['lounger_plan_id', 'venue_id', 'name', 'color', 'price_cents', 'water_meters', 'sort_order'];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(LoungerPlan::class, 'lounger_plan_id');
    }

    public function loungers(): HasMany
    {
        return $this->hasMany(Lounger::class, 'zone_id');
    }
}
