<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AmenityResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\PromotionResource;
use App\Http\Resources\VenueResource;
use App\Models\Amenity;
use App\Models\Category;
use App\Models\Promotion;
use App\Models\Setting;
use App\Models\Venue;
use App\Services\VenueQueryService;
use App\Support\ApiResponse;
use App\Support\ContentLocales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->whereNull('parent_id')
            ->with('children')
            ->orderBy('sort_order')
            ->get();

        return ApiResponse::success(CategoryResource::collection($categories));
    }

    public function amenities(): JsonResponse
    {
        return ApiResponse::success(
            AmenityResource::collection(Amenity::query()->orderBy('name')->get())
        );
    }

    public function cities(): JsonResponse
    {
        $cities = Venue::query()
            ->published()
            ->select('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->values();

        return ApiResponse::success($cities);
    }

    public function home(Request $request, VenueQueryService $venues): JsonResponse
    {
        $locale = ContentLocales::fromRequest($request);
        $city = trim((string) $request->query('city', ''));
        $payload = function () use ($request, $venues) {
            $sections = $venues->discovery($request);

            return [
                'featured' => VenueResource::collection($sections['featured'])->resolve(),
                'popular' => VenueResource::collection($sections['popular'])->resolve(),
                'recent' => VenueResource::collection($sections['recent'])->resolve(),
                'top_rated' => VenueResource::collection($sections['topRated'])->resolve(),
                'nearby' => VenueResource::collection($sections['nearby'])->resolve(),
                'categories' => CategoryResource::collection(
                    Category::query()->whereNull('parent_id')->with('children')->orderBy('sort_order')->get()
                )->resolve(),
                'promotions' => PromotionResource::collection(
                    Promotion::query()->where('is_active', true)->orderBy('sort_order')->get()
                )->resolve(),
                'settings' => Setting::many([
                    'site_name' => 'Shall We',
                    'tagline' => 'Otkrijte restorane, kafiće i barove u Crnoj Gori.',
                    'default_city' => 'Podgorica',
                    'support_email' => 'podrska@gdjecemo.me',
                ]),
            ];
        };

        if ($request->user('sanctum') !== null) {
            return ApiResponse::success($payload());
        }

        return ApiResponse::success(Cache::remember(
            'catalog.home.'.$locale.'.'.md5($city),
            now()->addSeconds(20),
            $payload,
        ));
    }
}
