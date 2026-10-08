<?php

namespace App\Services;

use App\Enums\BusinessStatus;
use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use App\Models\Business;
use App\Models\Category;
use App\Models\User;
use App\Models\Venue;
use App\Support\ContentLocales;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VenueService
{
    public function __construct(private readonly SlugService $slugs) {}

    public function create(User $user, array $data): Venue
    {
        $business = $this->authorizedBusiness($user, (int) $data['business_id']);
        $this->assertCategory($data);

        $data = $this->withTranslations($data);

        return DB::transaction(function () use ($user, $data, $business) {
            $venue = Venue::query()->create([
                ...$this->attributes($user, $data),
                'business_id' => $business->id,
                'slug' => $this->slugs->unique($data['name'], Venue::class),
                'status' => $this->statusFor($user, $data['status'] ?? VenueStatus::Draft->value),
                'verification_status' => $user->isAdmin()
                    ? ($data['verification_status'] ?? VerificationStatus::Unverified->value)
                    : VerificationStatus::Unverified->value,
                'timezone' => $data['timezone'] ?? config('app.timezone'),
            ]);

            $venue->amenities()->sync($data['amenity_ids'] ?? []);

            return $venue;
        });
    }

    public function update(User $user, Venue $venue, array $data): Venue
    {
        if (array_key_exists('business_id', $data)) {
            $this->authorizedBusiness($user, (int) $data['business_id']);
        }

        if (isset($data['category_id']) || array_key_exists('subcategory_id', $data)) {
            $this->assertCategory([
                'category_id' => $data['category_id'] ?? $venue->category_id,
                'subcategory_id' => $data['subcategory_id'] ?? $venue->subcategory_id,
            ]);
        }

        $data = $this->withTranslations($data, $venue->translations);

        return DB::transaction(function () use ($user, $venue, $data) {
            $attributes = $this->attributes($user, $data);

            if (isset($data['status'])) {
                $attributes['status'] = $this->statusFor($user, $data['status'], $venue);
            }

            if ($user->isAdmin() && isset($data['verification_status'])) {
                $attributes['verification_status'] = $data['verification_status'];
            }

            if ($user->isAdmin() && array_key_exists('is_featured', $data)) {
                $attributes['is_featured'] = (bool) $data['is_featured'];
                $attributes['featured_until'] = $data['featured_until'] ?? null;
            }

            $venue->update($attributes);

            if (array_key_exists('amenity_ids', $data)) {
                $venue->amenities()->sync($data['amenity_ids'] ?? []);
            }

            return $venue->refresh();
        });
    }

    private function authorizedBusiness(User $user, int $businessId): Business
    {
        $business = Business::query()->findOrFail($businessId);

        if ($user->isAdmin()) {
            return $business;
        }

        $belongs = $business->users()->where('users.id', $user->id)->exists();

        if (! $belongs || $business->status !== BusinessStatus::Approved) {
            throw ValidationException::withMessages([
                'business_id' => 'Možete uređivati samo odobreni biznis kojem pripadate.',
            ]);
        }

        return $business;
    }

    private function assertCategory(array $data): void
    {
        $category = Category::query()->find($data['category_id'] ?? null);

        if (! $category || $category->parent_id !== null) {
            throw ValidationException::withMessages([
                'category_id' => 'Odaberite glavnu kategoriju.',
            ]);
        }

        if (! empty($data['subcategory_id'])) {
            $subcategory = Category::query()->find($data['subcategory_id']);

            if (! $subcategory || $subcategory->parent_id !== $category->id) {
                throw ValidationException::withMessages([
                    'subcategory_id' => 'Potkategorija ne pripada odabranoj kategoriji.',
                ]);
            }
        }
    }

    private function statusFor(User $user, string $status, ?Venue $venue = null): string
    {
        if ($user->isAdmin()) {
            return $status;
        }

        if (! in_array($status, [VenueStatus::Draft->value, VenueStatus::Published->value], true)) {
            throw ValidationException::withMessages([
                'status' => 'Status nije dozvoljen.',
            ]);
        }

        return $status;
    }

    private function attributes(User $user, array $data): array
    {
        return Arr::only($data, [
            'business_id',
            'category_id',
            'subcategory_id',
            'name',
            'description',
            'address',
            'city',
            'country',
            'latitude',
            'longitude',
            'phone',
            'email',
            'website',
            'instagram',
            'facebook',
            'tiktok',
            'price_level',
            'timezone',
            'offers_delivery',
            'delivery_eta_minutes',
            'tagline',
            'brand_color',
            'translations',
        ]);
    }

    private function withTranslations(array $data, ?array $existing = null): array
    {
        if (! array_key_exists('translations', $data)) {
            return $data;
        }

        $merged = ContentLocales::merge($existing, $data['translations'], ['description', 'tagline']);
        $data['translations'] = $merged === [] ? null : $merged;

        return $data;
    }
}
