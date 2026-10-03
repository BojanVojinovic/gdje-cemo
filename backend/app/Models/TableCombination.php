<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TableCombination extends Model
{
    protected $fillable = ['venue_id', 'name', 'capacity_min', 'capacity_max', 'is_active'];

    protected function casts(): array
    {
        return [
            'capacity_min' => 'integer',
            'capacity_max' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function tables(): BelongsToMany
    {
        return $this->belongsToMany(VenueTable::class, 'table_combination_table');
    }
}
