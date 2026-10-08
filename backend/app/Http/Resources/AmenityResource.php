<?php

namespace App\Http\Resources;

use App\Support\ContentLocales;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AmenityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'label' => ContentLocales::text($this->name, $this->translations, 'name'),
            'slug' => $this->slug,
            'icon' => $this->icon,
        ];
    }
}
