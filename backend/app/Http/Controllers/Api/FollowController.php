<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use App\Models\UserNotification;
use App\Models\Venue;
use App\Models\VenueFollower;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    public function follow(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('view', $venue);
        VenueFollower::query()->firstOrCreate([
            'venue_id' => $venue->id,
            'user_id' => $request->user()->id,
        ]);

        return ApiResponse::success(['following' => true], 'Pratite novosti ovog mjesta.');
    }

    public function unfollow(Request $request, Venue $venue): JsonResponse
    {
        VenueFollower::query()->where('venue_id', $venue->id)->where('user_id', $request->user()->id)->delete();

        return ApiResponse::success(['following' => false], 'Više ne primate novosti.');
    }

    public function preferences(Request $request): JsonResponse
    {
        $preferences = NotificationPreference::query()->firstOrCreate(['user_id' => $request->user()->id]);

        return ApiResponse::success($preferences);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $preferences = NotificationPreference::query()->firstOrCreate(['user_id' => $request->user()->id]);
        $preferences->update($request->validate([
            'new_event' => ['sometimes', 'boolean'],
            'event_updated' => ['sometimes', 'boolean'],
            'event_cancelled' => ['sometimes', 'boolean'],
            'new_post' => ['sometimes', 'boolean'],
            'new_promotion' => ['sometimes', 'boolean'],
            'venue_announcement' => ['sometimes', 'boolean'],
            'reservation_confirmed' => ['sometimes', 'boolean'],
            'reservation_cancelled' => ['sometimes', 'boolean'],
            'reservation_reminder' => ['sometimes', 'boolean'],
            'order_status_changed' => ['sometimes', 'boolean'],
            'delivery_status' => ['sometimes', 'boolean'],
        ]));

        return ApiResponse::success($preferences->refresh(), 'Podešavanja obavještenja su sačuvana.');
    }

    public function notifications(Request $request): JsonResponse
    {
        $rows = UserNotification::query()->where('user_id', $request->user()->id)->latest()->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $rows->items(),
            'message' => null,
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function read(Request $request, UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403);
        }
        $notification->update(['read_at' => now()]);

        return ApiResponse::success(null, 'Obavještenje je pročitano.');
    }
}
