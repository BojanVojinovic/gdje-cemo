<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reason' => $this->reason,
            'description' => $this->description,
            'status' => $this->status?->value ?? $this->status,
            'reportable_type' => $this->reportable_type,
            'reportable_id' => $this->reportable_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'reporter' => $this->whenLoaded('reporter', fn () => [
                'id' => $this->reporter->id,
                'name' => $this->reporter->name,
                'email' => $this->reporter->email,
            ]),
            'administrator' => $this->whenLoaded('administrator', fn () => $this->administrator ? [
                'id' => $this->administrator->id,
                'name' => $this->administrator->name,
            ] : null),
        ];
    }
}
