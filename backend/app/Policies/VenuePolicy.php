<?php

namespace App\Policies;

use App\Enums\VenueStatus;
use App\Models\User;
use App\Models\Venue;

class VenuePolicy
{
    public function view(?User $user, Venue $venue): bool
    {
        if ($venue->status === VenueStatus::Published && $venue->business?->isApproved()) {
            return true;
        }

        if (! $user) {
            return false;
        }

        return $user->isAdmin() || $user->managesVenue($venue);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->hasPermission('venues.manage');
    }

    public function update(User $user, Venue $venue): bool
    {
        return $user->managesVenue($venue);
    }

    public function delete(User $user, Venue $venue): bool
    {
        return $user->isAdmin() || $user->managesVenue($venue);
    }
}
