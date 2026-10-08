<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Amenity extends Model
{
    protected $fillable = ['name', 'slug', 'icon', 'translations'];

    protected function casts(): array
    {
        return ['translations' => 'array'];
    }

    public function venues(): BelongsToMany
    {
        return $this->belongsToMany(Venue::class);
    }
}
