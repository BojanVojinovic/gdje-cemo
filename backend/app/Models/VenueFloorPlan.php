<?php

namespace App\Models;

use App\Services\ImageService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VenueFloorPlan extends Model
{
    protected $fillable = [
        'venue_id', 'name', 'background_path', 'canvas_width', 'canvas_height', 'version', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function zones(): HasMany
    {
        return $this->hasMany(VenueZone::class, 'floor_plan_id')->orderBy('sort_order');
    }

    public function tables(): HasMany
    {
        return $this->hasMany(VenueTable::class, 'floor_plan_id');
    }

    public function backgroundUrl(): ?string
    {
        return ImageService::url($this->background_path);
    }
}
