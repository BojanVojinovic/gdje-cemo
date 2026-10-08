<?php

namespace App\Http\Resources;

use App\Support\ContentLocales;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => ContentLocales::text($this->name, $this->translations, 'name'),
            'source_name' => $this->name,
            'translations' => $this->translations ?: (object) [],
            'station' => $this->station ?? 'kitchen',
            'sort_order' => $this->sort_order,
            'items' => MenuItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
