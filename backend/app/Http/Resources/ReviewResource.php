<?php

namespace App\Http\Resources;

use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'body' => $this->body,
            'status' => $this->status?->value ?? $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'username' => $this->user->username,
                'avatar_url' => ImageService::url($this->user->avatar_path),
            ]),
            'venue' => $this->whenLoaded('venue', fn () => [
                'id' => $this->venue->id,
                'name' => $this->venue->name,
                'slug' => $this->venue->slug,
                'city' => $this->venue->city,
            ]),
            'response' => $this->whenLoaded('response', fn () => $this->response ? [
                'id' => $this->response->id,
                'body' => $this->response->body,
                'created_at' => $this->response->created_at?->toIso8601String(),
                'user' => $this->response->relationLoaded('user') && $this->response->user ? [
                    'id' => $this->response->user->id,
                    'name' => $this->response->user->name,
                ] : null,
            ] : null),
            'can_edit' => $request->user('sanctum')?->id === $this->user_id,
        ];
    }
}
