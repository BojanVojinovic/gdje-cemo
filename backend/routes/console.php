<?php

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Services\ContentService;
use App\Services\NotificationService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('hospitality:sync', function (ContentService $content, NotificationService $notifications) {
    $published = $content->sync();
    $reminded = 0;

    Reservation::query()
        ->with(['user', 'venue'])
        ->whereIn('status', [ReservationStatus::Pending->value, ReservationStatus::Confirmed->value])
        ->where('start_at', '>', now())
        ->where('start_at', '<', now()->addHours(26))
        ->each(function (Reservation $reservation) use ($notifications, &$reminded) {
            if (! $reservation->user) {
                return;
            }
            $hours = (int) round(now()->diffInMinutes($reservation->start_at, false) / 60);
            foreach ([24, 2] as $mark) {
                if ($hours > $mark || $hours < $mark - 1) {
                    continue;
                }
                $key = 'reservation-reminder:'.$reservation->id.':'.$mark;
                if (! Cache::add($key, true, now()->addDays(3))) {
                    continue;
                }
                $notifications->notify(
                    $reservation->user,
                    'RESERVATION_REMINDER',
                    'Podsjetnik na rezervaciju',
                    $reservation->venue->name.' · '.$reservation->table_name_snapshot.' za '.$reservation->start_at->timezone($reservation->venue->timezone ?: config('app.timezone'))->format('d.m. H:i'),
                    ['reservation_id' => $reservation->id]
                );
                $reminded++;
            }
        });

    $this->info("Objavljeno {$published}, podsjetnika {$reminded}.");
})->purpose('Objavljuje zakazani sadržaj i šalje podsjetnike');

Schedule::command('hospitality:sync')->everyMinute();
