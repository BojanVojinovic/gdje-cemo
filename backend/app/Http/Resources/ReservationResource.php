<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $staff = $viewer && ($viewer->isAdmin() || ($this->venue && $viewer->managesVenue($this->venue)));
        $self = $viewer && $this->user_id === $viewer->id;

        return [
            'id' => $this->id,
            'venue' => $this->whenLoaded('venue', fn () => [
                'id' => $this->venue->id,
                'name' => $this->venue->name,
                'slug' => $this->venue->slug,
                'city' => $this->venue->city ?? null,
            ]),
            'party_size' => $this->party_size,
            'start_at' => $this->start_at?->toIso8601String(),
            'end_at' => $this->end_at?->toIso8601String(),
            'status' => $this->status?->value ?? $this->status,
            'source' => $this->source,
            'table_name' => $this->table_name_snapshot,
            'zone_name' => $this->zone_name_snapshot,
            'capacity' => $this->capacity_snapshot,
            'notes' => ($staff || $self) ? $this->notes : null,
            'guest_name' => $staff ? $this->guest_name : ($self ? $this->guest_name : null),
            'guest_phone' => $staff ? $this->guest_phone : null,
            'customer' => $staff && $this->relationLoaded('user') && $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'phone' => $this->user->phone,
            ] : null,
            'history' => $this->when($staff && $this->relationLoaded('history'), fn () => $this->history->map(fn ($row) => [
                'from' => $row->from_status,
                'to' => $row->to_status,
                'note' => $row->note,
                'created_at' => $row->created_at?->toIso8601String(),
            ])),
        ];
    }
}
