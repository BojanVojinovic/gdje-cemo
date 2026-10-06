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
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function stream(Request $request): StreamedResponse
    {
        $userId = $request->user()->id;
        $after = (int) $request->query('after', 0);

        return response()->stream(function () use ($userId, $after) {
            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            $started = time();
            while (time() - $started < 20) {
                $rows = UserNotification::query()
                    ->where('user_id', $userId)
                    ->where('id', '>', $after)
                    ->orderBy('id')
                    ->limit(20)
                    ->get();
                foreach ($rows as $row) {
                    $after = $row->id;
                    echo 'data: '.json_encode([
                        'id' => $row->id,
                        'type' => $row->type,
                        'title' => $row->title,
                        'body' => $row->body,
                        'data' => $row->data,
                        'created_at' => $row->created_at?->toIso8601String(),
                    ])."\n\n";
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                }
                echo ": ping\n\n";
                flush();
                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
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
