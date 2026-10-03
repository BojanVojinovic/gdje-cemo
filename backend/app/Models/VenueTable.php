<?php

namespace App\Models;

use App\Enums\TableShape;
use App\Enums\TableStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class VenueTable extends Model
{
    protected $fillable = [
        'venue_id', 'floor_plan_id', 'zone_id', 'name', 'capacity_min', 'capacity_max', 'shape',
        'position_x', 'position_y', 'width', 'height', 'rotation', 'status',
        'is_reservable', 'is_orderable', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'capacity_min' => 'integer',
            'capacity_max' => 'integer',
            'position_x' => 'float',
            'position_y' => 'float',
            'width' => 'float',
            'height' => 'float',
            'rotation' => 'float',
            'shape' => TableShape::class,
            'status' => TableStatus::class,
            'is_reservable' => 'boolean',
            'is_orderable' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(VenueZone::class, 'zone_id');
    }

    public function features(): BelongsToMany
    {
        return $this->belongsToMany(TableFeature::class, 'table_feature_venue_table');
    }

    public function qrCode(): HasOne
    {
        return $this->hasOne(TableQrCode::class)->where('is_active', true);
    }

    public function activeSession(): HasOne
    {
        return $this->hasOne(DiningSession::class)->where('status', 'active');
    }
}
