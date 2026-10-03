<?php

namespace App\Providers;

use App\Models\DiningSession;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Venue;
use App\Models\VenueContent;
use App\Models\VenueImage;
use App\Models\VenueTable;
use App\Models\VenueZone;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Relation::enforceMorphMap([
            'user' => User::class,
            'venue' => Venue::class,
            'venue_image' => VenueImage::class,
            'review' => Review::class,
            'venue_content' => VenueContent::class,
            'venue_table' => VenueTable::class,
            'reservation' => Reservation::class,
            'dining_session' => DiningSession::class,
        ]);

        Route::bind('zone', fn (string $value) => VenueZone::query()->findOrFail($value));
        Route::bind('table', fn (string $value) => VenueTable::query()->findOrFail($value));
        Route::bind('content', fn (string $value) => VenueContent::query()->findOrFail($value));
        Route::bind('session', fn (string $value) => DiningSession::query()->findOrFail($value));
        Route::bind('notification', fn (string $value) => UserNotification::query()->findOrFail($value));

        ResetPassword::createUrlUsing(function (User $user, string $token) {
            return rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $user->email,
            ]);
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            $limit = app()->environment('testing') ? 200 : 10;

            return Limit::perMinute($limit)->by($request->ip());
        });
    }
}
