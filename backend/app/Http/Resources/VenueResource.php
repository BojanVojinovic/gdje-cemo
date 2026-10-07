<?php

namespace App\Http\Resources;

use App\Services\ImageService;
use App\Services\OpeningHoursService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueResource extends JsonResource
{
    public static function ink(?string $hex): ?string
    {
        if ($hex === null || ! preg_match('/^#[0-9A-Fa-f]{6}$/', $hex)) {
            return null;
        }

        $red = hexdec(substr($hex, 1, 2));
        $green = hexdec(substr($hex, 3, 2));
        $blue = hexdec(substr($hex, 5, 2));
        $luma = (0.299 * $red + 0.587 * $green + 0.114 * $blue) / 255;

        return $luma > 0.62 ? '#07090f' : '#f7f9ff';
    }

    public function toArray(Request $request): array
    {
        $hours = app(OpeningHoursService::class);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'excerpt' => mb_strimwidth(trim(preg_replace('/\s+/', ' ', (string) $this->description)), 0, 180, '…'),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'subcategory' => new CategoryResource($this->whenLoaded('subcategory')),
            'address' => $this->address,
            'city' => $this->city,
            'country' => $this->country,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'socials' => [
                'instagram' => $this->instagram,
                'facebook' => $this->facebook,
                'tiktok' => $this->tiktok,
            ],
            'price_level' => $this->price_level,
            'price_label' => str_repeat('€', (int) $this->price_level),
            'cover_url' => ImageService::url($this->cover_path),
            'thumb_url' => ImageService::url($this->cover_thumb_path ?: $this->cover_path),
            'logo_url' => ImageService::url($this->logo_path),
            'tagline' => $this->tagline,
            'brand_color' => $this->brand_color,
            'brand_ink' => self::ink($this->brand_color),
            'rating_avg' => round((float) $this->rating_avg, 2),
            'reviews_count' => $this->reviews_count,
            'status' => $this->status?->value ?? $this->status,
            'verification_status' => $this->verification_status?->value ?? $this->verification_status,
            'is_featured' => (bool) $this->is_featured,
            'offers_delivery' => (bool) $this->offers_delivery,
            'delivery_eta_minutes' => $this->delivery_eta_minutes,
            'featured_until' => $this->featured_until?->toIso8601String(),
            'timezone' => $this->timezone,
            'is_open' => $hours->isOpen($this->resource),
            'is_saved' => (bool) ($this->is_saved ?? false),
            'distance_km' => isset($this->distance_km) ? round((float) $this->distance_km, 2) : null,
            'opening_hours' => $this->whenLoaded('openingHours', fn () => $hours->weeklySchedule($this->resource)),
            'amenities' => AmenityResource::collection($this->whenLoaded('amenities')),
            'images' => VenueImageResource::collection($this->whenLoaded('images')),
            'menu' => $this->when($this->relationLoaded('menus'), function () {
                $menu = $this->menus->first();

                return $menu ? new MenuResource($menu) : null;
            }),
            'business' => $this->whenLoaded('business', fn () => [
                'id' => $this->business->id,
                'name' => $this->business->name,
                'status' => $this->business->status?->value ?? $this->business->status,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
