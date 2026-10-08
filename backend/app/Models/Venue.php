<?php

namespace App\Models;

use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Venue extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'business_id',
        'category_id',
        'subcategory_id',
        'name',
        'slug',
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
        'cover_path',
        'cover_thumb_path',
        'logo_path',
        'tagline',
        'brand_color',
        'status',
        'verification_status',
        'is_featured',
        'offers_delivery',
        'delivery_eta_minutes',
        'featured_until',
        'timezone',
        'rating_avg',
        'reviews_count',
        'profile_views',
        'menu_views',
        'publishing_suspended',
        'translations',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'price_level' => 'integer',
            'is_featured' => 'boolean',
            'offers_delivery' => 'boolean',
            'featured_until' => 'datetime',
            'rating_avg' => 'float',
            'reviews_count' => 'integer',
            'profile_views' => 'integer',
            'menu_views' => 'integer',
            'publishing_suspended' => 'boolean',
            'translations' => 'array',
            'status' => VenueStatus::class,
            'verification_status' => VerificationStatus::class,
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'subcategory_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(VenueImage::class)->orderBy('sort_order');
    }

    public function openingHours(): HasMany
    {
        return $this->hasMany(OpeningHour::class)->orderBy('day_of_week')->orderBy('opens_at');
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class);
    }

    public function menus(): HasMany
    {
        return $this->hasMany(Menu::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function floorPlans(): HasMany
    {
        return $this->hasMany(VenueFloorPlan::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->where('venues.status', VenueStatus::Published->value)
            ->whereHas('business', fn (Builder $business) => $business->where('status', 'approved'));
    }

    public function scopeFeaturedActive(Builder $query): Builder
    {
        return $query->where('is_featured', true)->where(function (Builder $inner) {
            $inner->whereNull('featured_until')->orWhere('featured_until', '>', now());
        });
    }
}
