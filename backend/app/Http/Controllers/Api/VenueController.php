<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Models\VenueMetricDay;
use App\Services\ReviewService;
use App\Services\VenueQueryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

class VenueController extends Controller
{
    public function index(Request $request, VenueQueryService $venues): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->integer('per_page', 12)));
        $paginator = $venues->publicList($request)->paginate($perPage)->withQueryString();

        return ApiResponse::paginated($paginator, VenueResource::class);
    }

    public function show(Request $request, string $slug, ReviewService $reviews): JsonResponse
    {
        $venue = Venue::query()->where('slug', $slug)->firstOrFail();
        $user = $request->user('sanctum');

        if (! Gate::forUser($user)->allows('view', $venue)) {
            abort(404);
        }

        $venue->load([
            'category',
            'subcategory',
            'openingHours',
            'amenities',
            'images',
            'business',
            'menus.categories.items',
        ]);

        if ($user) {
            $venue->setAttribute('is_saved', $venue->favorites()->where('user_id', $user->id)->exists());
        }

        $this->recordMetric($request, $venue, 'profile_views');

        $similar = Venue::query()
            ->published()
            ->where('id', '!=', $venue->id)
            ->where('category_id', $venue->category_id)
            ->with(['category', 'subcategory', 'openingHours'])
            ->orderByRaw('case when city = ? then 0 else 1 end', [$venue->city])
            ->orderByDesc('rating_avg')
            ->limit(4)
            ->get();

        if ($user) {
            $savedIds = $user->favorites()->whereIn('venue_id', $similar->pluck('id'))->pluck('venue_id');
            $similar->each(fn (Venue $item) => $item->setAttribute('is_saved', $savedIds->contains($item->id)));
        }

        return ApiResponse::success([
            'venue' => new VenueResource($venue),
            'rating_distribution' => $reviews->distribution($venue),
            'similar' => VenueResource::collection($similar),
        ]);
    }

    public function menu(Request $request, Venue $venue): JsonResponse
    {
        $user = $request->user('sanctum');

        if (! Gate::forUser($user)->allows('view', $venue)) {
            abort(404);
        }

        $venue->load('menus.categories.items');
        $this->recordMetric($request, $venue, 'menu_views');

        return ApiResponse::success((new VenueResource($venue))->resolve($request)['menu'] ?? null);
    }

    private function recordMetric(Request $request, Venue $venue, string $column): void
    {
        $key = $column.':'.$venue->id.':'.$request->ip();

        if (Cache::add($key, true, now()->addHours(6))) {
            $venue->increment($column);
            $day = VenueMetricDay::query()->firstOrCreate([
                'venue_id' => $venue->id,
                'date' => now()->timezone('Europe/Podgorica')->toDateString(),
            ], ['profile_views' => 0, 'menu_views' => 0]);
            $day->increment($column);
        }
    }

    public function reviews(Request $request, Venue $venue): JsonResponse
    {
        $user = $request->user('sanctum');

        if (! Gate::forUser($user)->allows('view', $venue)) {
            abort(404);
        }

        $reviews = $venue->reviews()
            ->where('status', ReviewStatus::Published->value)
            ->with(['user', 'response.user'])
            ->latest()
            ->paginate(min(20, max(1, (int) $request->integer('per_page', 8))));

        return ApiResponse::paginated($reviews, ReviewResource::class);
    }
}
