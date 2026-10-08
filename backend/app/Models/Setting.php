<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function getValue(string $key, ?string $default = null): ?string
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }

    /**
     * @param  array<string, string|null>  $defaults
     * @return array<string, string|null>
     */
    public static function many(array $defaults): array
    {
        $stored = static::query()->whereIn('key', array_keys($defaults))->pluck('value', 'key');
        $values = [];

        foreach ($defaults as $key => $default) {
            $values[$key] = $stored[$key] ?? $default;
        }

        return $values;
    }
}
