<?php

namespace App\Policies;

use App\Models\Review;
use App\Models\User;

class ReviewPolicy
{
    public function update(User $user, Review $review): bool
    {
        return $user->isAdmin() || $user->id === $review->user_id;
    }

    public function delete(User $user, Review $review): bool
    {
        return $user->isAdmin() || $user->id === $review->user_id;
    }

    public function respond(User $user, Review $review): bool
    {
        if (! $user->hasPermission('reviews.respond') && ! $user->isAdmin()) {
            return false;
        }

        return $user->managesVenue($review->venue);
    }

    public function moderate(User $user): bool
    {
        return $user->isAdmin() || $user->hasPermission('reviews.moderate');
    }
}
