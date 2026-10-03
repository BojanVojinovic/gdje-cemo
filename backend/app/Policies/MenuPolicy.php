<?php

namespace App\Policies;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use App\Models\Venue;

class MenuPolicy
{
    public function manageVenue(User $user, Venue $venue): bool
    {
        return $user->managesVenue($venue) && ($user->isAdmin() || $user->hasPermission('menu.manage'));
    }

    public function manageCategory(User $user, MenuCategory $category): bool
    {
        $venue = $category->menu?->venue;

        return $venue ? $this->manageVenue($user, $venue) : false;
    }

    public function manageItem(User $user, MenuItem $item): bool
    {
        $item->loadMissing('category.menu.venue');
        $venue = $item->category?->menu?->venue;

        return $venue ? $this->manageVenue($user, $venue) : false;
    }
}
