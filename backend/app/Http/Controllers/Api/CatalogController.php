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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $sections = $venues->discovery($request);

        return ApiResponse::success([
            'featured' => VenueResource::collection($sections['featured']),
            'popular' => VenueResource::collection($sections['popular']),
            'recent' => VenueResource::collection($sections['recent']),
            'top_rated' => VenueResource::collection($sections['topRated']),
            'nearby' => VenueResource::collection($sections['nearby']),
            'categories' => CategoryResource::collection(
                Category::query()->whereNull('parent_id')->with('children')->orderBy('sort_order')->get()
            ),
            'promotions' => PromotionResource::collection(
                Promotion::query()->where('is_active', true)->orderBy('sort_order')->get()
            ),
            'settings' => [
                'site_name' => Setting::getValue('site_name', 'Gdje ćemo'),
                'tagline' => Setting::getValue('tagline', 'Otkrijte restorane, kafiće i barove u Crnoj Gori.'),
                'default_city' => Setting::getValue('default_city', 'Podgorica'),
                'support_email' => Setting::getValue('support_email', 'podrska@gdjecemo.me'),
            ],
        ]);
    }
}
