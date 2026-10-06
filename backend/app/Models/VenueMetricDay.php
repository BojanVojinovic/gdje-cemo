<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueMetricDay extends Model
{
    protected $fillable = ['venue_id', 'date', 'profile_views', 'menu_views'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'profile_views' => 'integer',
            'menu_views' => 'integer',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }
}
