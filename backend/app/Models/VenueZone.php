<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VenueZone extends Model
{
    protected $fillable = ['floor_plan_id', 'venue_id', 'name', 'color', 'sort_order'];

    public function floorPlan(): BelongsTo
    {
        return $this->belongsTo(VenueFloorPlan::class, 'floor_plan_id');
    }

    public function tables(): HasMany
    {
        return $this->hasMany(VenueTable::class, 'zone_id');
    }
}
