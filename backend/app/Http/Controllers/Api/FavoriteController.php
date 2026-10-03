<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Favorite;
use App\Models\Venue;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->integer('per_page', 12)));

        $venues = Venue::query()
            ->select('venues.*')
            ->published()
            ->whereIn('venues.id', $request->user()->favorites()->select('venue_id'))
            ->with(['category', 'subcategory', 'openingHours'])
            ->withExists([
                'favorites as is_saved' => fn ($query) => $query->where('user_id', $request->user()->id),
            ])
            ->latest('venues.updated_at')
            ->paginate($perPage);

        return ApiResponse::paginated($venues, VenueResource::class);
    }

    public function store(Request $request, Venue $venue): JsonResponse
    {
        if ($venue->status->value !== 'published') {
            abort(404);
        }

        Favorite::query()->firstOrCreate([
            'user_id' => $request->user()->id,
            'venue_id' => $venue->id,
        ]);

        return ApiResponse::success(['is_saved' => true], 'Mjesto je sačuvano.');
    }

    public function destroy(Request $request, Venue $venue): JsonResponse
    {
        Favorite::query()
            ->where('user_id', $request->user()->id)
            ->where('venue_id', $venue->id)
            ->delete();

        return ApiResponse::success(['is_saved' => false], 'Mjesto je uklonjeno iz sačuvanih.');
    }
}
