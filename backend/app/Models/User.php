<?php

namespace App\Models;

use App\Enums\BusinessStatus;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'role_id',
        'first_name',
        'last_name',
        'username',
        'email',
        'phone',
        'avatar_path',
        'password',
        'is_active',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function businesses(): BelongsToMany
    {
        return $this->belongsToMany(Business::class, 'business_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function favoriteVenues(): BelongsToMany
    {
        return $this->belongsToMany(Venue::class, 'favorites')->withTimestamps();
    }

    public function getNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    public function hasRole(string ...$roles): bool
    {
        $this->loadMissing('role');

        return in_array($this->role?->slug, $roles, true);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isBusiness(): bool
    {
        return $this->hasRole('business');
    }

    public function hasPermission(string $permission): bool
    {
        $this->loadMissing('role.permissions');

        if ($this->role?->slug === 'admin') {
            return true;
        }

        return (bool) $this->role?->permissions->contains('slug', $permission);
    }

    public function managesVenue(Venue $venue): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if (! $this->hasPermission('venues.manage')) {
            return false;
        }

        return $this->businesses()
            ->where('businesses.id', $venue->business_id)
            ->where('businesses.status', BusinessStatus::Approved->value)
            ->exists();
    }
}
