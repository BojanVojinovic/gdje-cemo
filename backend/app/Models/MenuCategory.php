<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuCategory extends Model
{
    protected $fillable = ['menu_id', 'name', 'station', 'sort_order', 'translations'];

    protected function casts(): array
    {
        return ['translations' => 'array'];
    }

    public static function stationForName(string $name): string
    {
        return preg_match('/pić|pice|koktel|vino|pivo|kafa|kava|sok|bar|žest|napit/iu', $name) ? 'bar' : 'kitchen';
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class)->orderBy('sort_order');
    }
}
