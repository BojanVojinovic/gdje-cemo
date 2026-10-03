<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueContentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type?->value ?? $this->type,
            'title' => $this->title,
            'slug' => $this->slug,
            'body' => $this->body,
            'cover_url' => $this->coverUrl(),
            'video_url' => $this->video_url,
            'status' => $this->status?->value ?? $this->status,
            'priority' => $this->priority,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'published_at' => $this->published_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'event_start_at' => $this->event_start_at?->toIso8601String(),
            'event_end_at' => $this->event_end_at?->toIso8601String(),
            'event_category' => $this->event_category,
            'price' => $this->price,
            'capacity' => $this->capacity,
            'registration_mode' => $this->registration_mode,
            'organizer' => $this->organizer,
            'valid_from' => $this->valid_from?->toIso8601String(),
            'valid_until' => $this->valid_until?->toIso8601String(),
            'daily_start' => $this->daily_start ? substr((string) $this->daily_start, 0, 5) : null,
            'daily_end' => $this->daily_end ? substr((string) $this->daily_end, 0, 5) : null,
            'days_of_week' => $this->days_of_week,
            'terms' => $this->terms,
            'venue' => $this->whenLoaded('venue', fn () => [
                'id' => $this->venue->id,
                'name' => $this->venue->name,
                'slug' => $this->venue->slug,
                'city' => $this->venue->city,
            ]),
        ];
    }
}
