<?php

namespace App\Http\Controllers\Api\Business;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVenueRequest;
use App\Http\Requests\UpdateVenueRequest;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\VenueImageResource;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Models\VenueImage;
use App\Services\ImageService;
use App\Services\VenueQueryService;
use App\Services\VenueService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VenueController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $venues = $this->owned($request)->withCount('favorites')->get();

        return ApiResponse::success([
            'venues_count' => $venues->count(),
            'profile_views' => (int) $venues->sum('profile_views'),
            'menu_views' => (int) $venues->sum('menu_views'),
            'reviews_count' => (int) $venues->sum('reviews_count'),
            'favorites_count' => (int) $venues->sum('favorites_count'),
            'rating_avg' => $venues->where('reviews_count', '>', 0)->avg('rating_avg')
                ? round((float) $venues->where('reviews_count', '>', 0)->avg('rating_avg'), 2)
                : 0,
            'venues' => VenueResource::collection($venues->load(['category', 'subcategory', 'openingHours'])),
        ]);
    }

    public function index(Request $request, VenueQueryService $query): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->integer('per_page', 12)));
        $venues = $query->managedList($request, $request->user())->paginate($perPage);

        return ApiResponse::paginated($venues, VenueResource::class);
    }

    public function store(StoreVenueRequest $request, VenueService $venues): JsonResponse
    {
        $venue = $venues->create($request->user(), $request->validated());
        $venue->load(['category', 'subcategory', 'amenities', 'openingHours', 'business']);

        return ApiResponse::success(new VenueResource($venue), 'Mjesto je kreirano.', 201);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('view', $venue);
        $venue->load(['category', 'subcategory', 'amenities', 'openingHours', 'images', 'business', 'menus.categories.items']);

        return ApiResponse::success([
            'venue' => new VenueResource($venue),
            'stats' => $this->stats($venue),
        ]);
    }

    public function update(UpdateVenueRequest $request, Venue $venue, VenueService $venues): JsonResponse
    {
        $this->authorize('update', $venue);
        $venue = $venues->update($request->user(), $venue, $request->validated());
        $venue->load(['category', 'subcategory', 'amenities', 'openingHours', 'business']);

        return ApiResponse::success(new VenueResource($venue), 'Podaci o mjestu su sačuvani.');
    }

    public function destroy(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('delete', $venue);
        $venue->delete();

        return ApiResponse::success(null, 'Mjesto je obrisano.');
    }

    public function uploadImages(Request $request, Venue $venue, ImageService $images): JsonResponse
    {
        $this->authorize('update', $venue);
        $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:8'],
            'images.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'alt' => ['nullable', 'string', 'max:160'],
        ]);

        $created = DB::transaction(function () use ($request, $venue, $images) {
            $next = (int) $venue->images()->max('sort_order');
            $stored = [];

            foreach ($request->file('images', []) as $file) {
                $next++;
                $meta = $images->store($file, 'venues/'.$venue->id, 1800, 720, 600, 400);
                $stored[] = $venue->images()->create([
                    ...$meta,
                    'alt' => $request->input('alt') ?: $venue->name,
                    'sort_order' => $next,
                ]);
            }

            return $stored;
        });

        return ApiResponse::success(VenueImageResource::collection(collect($created)), 'Fotografije su dodate.', 201);
    }

    public function updateCover(Request $request, Venue $venue, ImageService $images): JsonResponse
    {
        $this->authorize('update', $venue);
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $meta = $images->store($request->file('image'), 'venues/'.$venue->id.'/cover', 1800, 900, 800, 500);
        $images->delete($venue->cover_path, $venue->cover_thumb_path);
        $venue->update([
            'cover_path' => $meta['path'],
            'cover_thumb_path' => $meta['thumb_path'],
        ]);

        return ApiResponse::success(new VenueResource($venue->load(['category', 'subcategory', 'openingHours'])), 'Naslovna fotografija je sačuvana.');
    }

    public function destroyImage(Request $request, Venue $venue, VenueImage $image, ImageService $images): JsonResponse
    {
        $this->authorize('update', $venue);
        $this->guardImage($venue, $image);
        $images->delete($image->path, $image->thumb_path);
        $image->delete();

        return ApiResponse::success(null, 'Fotografija je obrisana.');
    }

    public function reorderImages(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $owned = $venue->images()->whereIn('id', $data['ids'])->pluck('id');

        if ($owned->count() !== count($data['ids'])) {
            throw ValidationException::withMessages(['ids' => 'Redoslijed sadrži fotografiju koja ne pripada ovom mjestu.']);
        }

        foreach ($data['ids'] as $index => $id) {
            VenueImage::query()->where('id', $id)->update(['sort_order' => $index]);
        }

        return ApiResponse::success(null, 'Redoslijed fotografija je sačuvan.');
    }

    public function reviews(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $reviews = $venue->reviews()->with(['user', 'response.user'])->latest()
            ->paginate(min(50, max(1, (int) $request->integer('per_page', 10))));

        return ApiResponse::paginated($reviews, ReviewResource::class);
    }

    public function stats(Venue $venue): array
    {
        return [
            'profile_views' => $venue->profile_views,
            'menu_views' => $venue->menu_views,
            'reviews_count' => $venue->reviews_count,
            'rating_avg' => round((float) $venue->rating_avg, 2),
            'favorites_count' => $venue->favorites()->count(),
        ];
    }

    private function owned(Request $request)
    {
        $query = Venue::query();

        if (! $request->user()->isAdmin()) {
            $ids = $request->user()->businesses()->pluck('businesses.id');
            $query->whereIn('business_id', $ids);
        }

        return $query;
    }

    private function guardImage(Venue $venue, VenueImage $image): void
    {
        if ($image->venue_id !== $venue->id) {
            abort(404);
        }
    }
}
