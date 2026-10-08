<?php

namespace App\Http\Resources;

use App\Services\ImageService;
use App\Support\ContentLocales;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = ContentLocales::fromRequest($request);

        return [
            'id' => $this->id,
            'name' => ContentLocales::text($this->name, $this->translations, 'name', $locale),
            'description' => ContentLocales::text($this->description, $this->translations, 'description', $locale),
            'source_name' => $this->name,
            'source_description' => $this->description,
            'translations' => $this->translations ?: (object) [],
            'price' => $this->price,
            'image_url' => ImageService::url($this->image_path),
            'is_available' => $this->is_available,
            'sort_order' => $this->sort_order,
            'category_id' => $this->menu_category_id,
        ];
    }
}
