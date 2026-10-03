<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SlugService
{
    /**
     * @param  class-string<Model>  $model
     */
    public function unique(string $source, string $model, ?int $ignoreId = null, string $column = 'slug'): string
    {
        $base = Str::slug($source);
        if ($base === '') {
            $base = 'stavka';
        }

        $slug = $base;
        $suffix = 2;

        while ($this->exists($model, $column, $slug, $ignoreId)) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function exists(string $model, string $column, string $slug, ?int $ignoreId): bool
    {
        $query = $model::query();

        if (in_array(SoftDeletes::class, class_uses_recursive($model), true)) {
            $query->withTrashed();
        }

        return $query
            ->where($column, $slug)
            ->when($ignoreId, fn ($builder) => $builder->where('id', '!=', $ignoreId))
            ->exists();
    }
}
