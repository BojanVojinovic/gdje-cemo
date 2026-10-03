<?php

namespace App\Policies;

use App\Models\Business;
use App\Models\User;

class BusinessPolicy
{
    public function view(User $user, Business $business): bool
    {
        return $user->isAdmin() || $business->users()->where('users.id', $user->id)->exists();
    }

    public function update(User $user, Business $business): bool
    {
        return $user->isAdmin() || $business->users()->where('users.id', $user->id)->wherePivot('role', 'owner')->exists();
    }

    public function moderate(User $user): bool
    {
        return $user->isAdmin();
    }
}
