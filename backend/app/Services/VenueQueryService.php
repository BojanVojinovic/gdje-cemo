<?php

namespace App\Services;

use App\Enums\VerificationStatus;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class VenueQueryService
{
    public function __construct(private readonly OpeningHoursService $hours) {}

    public function publicList(Request $request): Builder
    {
        $query = $this->base($request)->published();

        return $this->applyFilters($query, $request);
    }

    /**
     * @return array<string, \Illuminate\Support\Collection<int, Venue>>
     */
    public function discovery(Request $request): array
    {
        $city = trim((string) $request->query('city', ''));

        $base = $this->base($request)
            ->published()
            ->when($city !== '', fn (Builder $query) => $query->where('venues.city', $city));

        $featured = (clone $base)->reorder()->featuredActive()->orderByDesc('venues.rating_avg')->limit(6)->get();
        $popular = (clone $base)->reorder()->orderByDesc('venues.profile_views')->orderByDesc('venues.rating_avg')->limit(8)->get();
        $recent = (clone $base)->reorder()->latest('venues.created_at')->limit(8)->get();
        $topRated = (clone $base)->reorder()
            ->where('venues.reviews_count', '>', 0)
            ->orderByDesc('venues.rating_avg')
            ->orderByDesc('venues.reviews_count')
            ->limit(8)
            ->get();

        $nearby = collect();
        if (is_numeric($request->query('lat')) && is_numeric($request->query('lng'))) {
            $nearbyRequest = $request->duplicate(query: array_merge($request->query(), [
                'radius_km' => $request->query('radius_km', 25),
                'sort' => 'distance',
                'city' => null,
            ]));
            $nearby = $this->publicList($nearbyRequest)->limit(8)->get();
        }

        return compact('featured', 'popular', 'recent', 'topRated', 'nearby');
    }

    public function adminList(Request $request): Builder
    {
        return $this->applyFilters($this->base($request), $request, includeUnpublished: true);
    }

    public function managedList(Request $request, User $user): Builder
    {
        $query = $this->base($request);

        if (! $user->isAdmin()) {
            $businessIds = $user->businesses()->pluck('businesses.id');
            $query->whereIn('venues.business_id', $businessIds);
        }

        return $this->applyFilters($query, $request, includeUnpublished: true);
    }

    private function base(Request $request): Builder
    {
        $query = Venue::query()->select('venues.*')->with([
            'category:id,name,slug,icon,parent_id',
            'subcategory:id,name,slug,icon,parent_id',
            'openingHours',
        ]);

        $user = $request->user('sanctum');

        if ($user) {
            $query->withExists([
                'favorites as is_saved' => fn (Builder $favorites) => $favorites->where('user_id', $user->id),
            ]);
        }

        return $query;
    }

    private function applyFilters(Builder $query, Request $request, bool $includeUnpublished = false): Builder
    {
        if ($search = trim((string) $request->query('q', ''))) {
            $like = '%'.$search.'%';
            $query->where(function (Builder $inner) use ($like) {
                $inner->where('venues.name', 'like', $like)
                    ->orWhere('venues.city', 'like', $like)
                    ->orWhere('venues.address', 'like', $like)
                    ->orWhere('venues.description', 'like', $like)
                    ->orWhereHas('category', fn (Builder $category) => $category->where('name', 'like', $like))
                    ->orWhereHas('subcategory', fn (Builder $category) => $category->where('name', 'like', $like));
            });
        }

        if ($category = $request->query('category')) {
            $query->where(function (Builder $inner) use ($category) {
                $inner->whereHas('category', function (Builder $relation) use ($category) {
                    $relation->where('slug', $category)->orWhere('id', $category);
                })->orWhereHas('subcategory', function (Builder $relation) use ($category) {
                    $relation->where('slug', $category)->orWhere('id', $category);
                });
            });
        }

        if ($city = trim((string) $request->query('city', ''))) {
            $query->where('venues.city', $city);
        }

        if ($request->filled('price_level')) {
            $levels = array_filter(array_map('intval', explode(',', (string) $request->query('price_level'))));
            $query->whereIn('venues.price_level', $levels);
        }

        if ($request->filled('min_rating')) {
            $query->where('venues.rating_avg', '>=', (float) $request->query('min_rating'));
        }

        if ($request->boolean('verified')) {
            $query->where('venues.verification_status', VerificationStatus::Verified->value);
        }

        if ($request->filled('status') && $includeUnpublished) {
            $query->where('venues.status', $request->query('status'));
        }

        if ($amenities = $request->query('amenities')) {
            $slugs = array_values(array_filter(array_map('trim', explode(',', (string) $amenities))));

            foreach ($slugs as $slug) {
                $query->whereHas('amenities', function (Builder $amenity) use ($slug) {
                    $amenity->where('slug', $slug)->orWhere('amenities.id', $slug);
                });
            }
        }

        $lat = $request->query('lat');
        $lng = $request->query('lng');
        $hasPoint = is_numeric($lat) && is_numeric($lng);

        if ($hasPoint) {
            $distance = $this->distanceSql();
            $query->selectRaw($distance.' as distance_km', [(float) $lat, (float) $lng, (float) $lat]);

            if ($request->filled('radius_km')) {
                $query->whereRaw($distance.' <= ?', [(float) $lat, (float) $lng, (float) $lat, (float) $request->query('radius_km')]);
            }
        }

        if ($request->boolean('open')) {
            $this->hours->constrainOpen($query);
        }

        $sort = (string) $request->query('sort', $hasPoint ? 'distance' : 'popular');

        match ($sort) {
            'rating' => $query->orderByDesc('venues.rating_avg')->orderByDesc('venues.reviews_count'),
            'reviews' => $query->orderByDesc('venues.reviews_count'),
            'newest' => $query->orderByDesc('venues.created_at'),
            'name' => $query->orderBy('venues.name'),
            'distance' => $hasPoint ? $query->orderBy('distance_km') : $query->orderByDesc('venues.profile_views'),
            default => $query->orderByDesc('venues.profile_views')->orderByDesc('venues.rating_avg'),
        };

        return $query->orderBy('venues.id');
    }

    private function distanceSql(): string
    {
        return '(6371 * acos(least(1, cos(radians(?)) * cos(radians(venues.latitude)) * cos(radians(venues.longitude) - radians(?)) + sin(radians(?)) * sin(radians(venues.latitude)))))';
    }
}
