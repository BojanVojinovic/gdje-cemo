<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Services\AnalyticsService;
use App\Services\SubscriptionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function business(Request $request, AnalyticsService $analytics, SubscriptionService $subscriptions): JsonResponse
    {
        $query = Venue::query();
        if (! $request->user()->isAdmin()) {
            $businesses = $request->user()->businesses()->with('subscription.plan')->get();
            foreach ($businesses as $business) {
                $subscriptions->assertFeature($request->user(), $business, 'analytics');
            }
            $query->whereIn('business_id', $businesses->pluck('id'));
        }

        return ApiResponse::success($analytics->business(
            $query->get(),
            (int) $request->query('days', 30),
            $request->filled('venue_id') ? (int) $request->query('venue_id') : null,
        ));
    }

    public function admin(Request $request, AnalyticsService $analytics): JsonResponse
    {
        return ApiResponse::success($analytics->admin((int) $request->query('days', 30)));
    }
}
