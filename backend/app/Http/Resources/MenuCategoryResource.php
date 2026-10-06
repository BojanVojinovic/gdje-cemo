<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'station' => $this->station ?? 'kitchen',
            'sort_order' => $this->sort_order,
            'items' => MenuItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
