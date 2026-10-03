<?php

namespace App\Http\Resources;

use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'image_url' => ImageService::url($this->image_path),
            'is_available' => $this->is_available,
            'sort_order' => $this->sort_order,
            'category_id' => $this->menu_category_id,
        ];
    }
}
