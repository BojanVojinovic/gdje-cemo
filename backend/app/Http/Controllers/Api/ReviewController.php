<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewRequest;
use App\Http\Requests\UpdateReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Models\Venue;
use App\Services\ReviewService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    public function store(StoreReviewRequest $request, Venue $venue, ReviewService $reviews): JsonResponse
    {
        if (! $request->user('sanctum') && ! $request->user()) {
            abort(401);
        }

        $user = $request->user();

        if ($venue->status->value !== 'published') {
            abort(404);
        }

        $existing = Review::withTrashed()
            ->where('user_id', $user->id)
            ->where('venue_id', $venue->id)
            ->first();

        if ($existing && ! $existing->trashed()) {
            throw ValidationException::withMessages([
                'body' => 'Već ste ostavili recenziju za ovo mjesto. Možete je izmijeniti.',
            ]);
        }

        $review = DB::transaction(function () use ($existing, $user, $venue, $request, $reviews) {
            if ($existing) {
                $existing->restore();
                $existing->update([
                    'rating' => $request->integer('rating'),
                    'body' => $request->string('body')->value(),
                    'status' => ReviewStatus::Published,
                ]);
                $review = $existing->refresh();
            } else {
                $review = Review::query()->create([
                    'user_id' => $user->id,
                    'venue_id' => $venue->id,
                    'rating' => $request->integer('rating'),
                    'body' => $request->string('body')->value(),
                    'status' => ReviewStatus::Published,
                ]);
            }

            $reviews->recalculate($venue);

            return $review;
        });

        $review->load(['user', 'response.user', 'venue:id,name,slug,city']);

        return ApiResponse::success(new ReviewResource($review), 'Recenzija je sačuvana.', 201);
    }

    public function update(UpdateReviewRequest $request, Review $review, ReviewService $reviews): JsonResponse
    {
        $review->update($request->validated());
        $reviews->recalculate($review->venue);
        $review->load(['user', 'response.user', 'venue:id,name,slug,city']);

        return ApiResponse::success(new ReviewResource($review), 'Recenzija je izmijenjena.');
    }

    public function destroy(Request $request, Review $review, ReviewService $reviews): JsonResponse
    {
        $this->authorize('delete', $review);
        $venue = $review->venue;
        $review->delete();
        $reviews->recalculate($venue);

        return ApiResponse::success(null, 'Recenzija je obrisana.');
    }

    public function respond(Request $request, Review $review): JsonResponse
    {
        $this->authorize('respond', $review);

        $data = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        $response = $review->response()->updateOrCreate(
            ['review_id' => $review->id],
            ['user_id' => $request->user()->id, 'body' => $data['body']]
        );

        $review->load(['user', 'response.user', 'venue:id,name,slug,city']);

        return ApiResponse::success(new ReviewResource($review), 'Odgovor je sačuvan.');
    }
}
