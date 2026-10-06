<?php

namespace App\Http\Resources;

use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar_url' => ImageService::url($this->avatar_path),
            'role' => $this->role?->slug,
            'is_active' => $this->is_active,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'locale' => $this->locale ?: 'en',
            'created_at' => $this->created_at?->toIso8601String(),
            'businesses' => $this->whenLoaded('businesses', fn () => $this->businesses->map(fn ($business) => [
                'id' => $business->id,
                'name' => $business->name,
                'slug' => $business->slug,
                'status' => $business->status?->value ?? $business->status,
                'pivot_role' => $business->pivot?->role,
            ])->values()),
            'staff' => $this->whenLoaded('staffAssignments', fn () => $this->staffAssignments->map(fn ($row) => [
                'venue_id' => $row->venue_id,
                'venue_name' => $row->venue?->name,
                'venue_slug' => $row->venue?->slug,
                'business_id' => $row->business_id,
                'roles' => $row->roles ?? [],
            ])->values()),
        ];
    }
}
