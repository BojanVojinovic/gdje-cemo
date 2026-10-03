<?php

namespace App\Services;

use App\Enums\ReviewStatus;
use App\Models\Review;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;

class ReviewService
{
    public function recalculate(Venue $venue): void
    {
        $stats = Review::query()
            ->where('venue_id', $venue->id)
            ->where('status', ReviewStatus::Published->value)
            ->selectRaw('COUNT(*) as aggregate_count, AVG(rating) as aggregate_avg')
            ->first();

        $count = (int) ($stats->aggregate_count ?? 0);

        $venue->forceFill([
            'reviews_count' => $count,
            'rating_avg' => $count > 0 ? round((float) $stats->aggregate_avg, 2) : 0,
        ])->save();
    }

    /**
     * @return array<int, int>
     */
    public function distribution(Venue $venue): array
    {
        $counts = Review::query()
            ->where('venue_id', $venue->id)
            ->where('status', ReviewStatus::Published->value)
            ->select('rating', DB::raw('COUNT(*) as total'))
            ->groupBy('rating')
            ->pluck('total', 'rating');

        $distribution = [];

        for ($rating = 5; $rating >= 1; $rating--) {
            $distribution[$rating] = (int) ($counts[$rating] ?? 0);
        }

        return $distribution;
    }
}
