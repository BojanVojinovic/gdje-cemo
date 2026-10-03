<?php

namespace App\Services;

use App\Models\OpeningHour;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class OpeningHoursService
{
    /**
     * @param  array<int, array{day_of_week: int, opens_at: string, closes_at: string}>  $intervals
     */
    public function replace(Venue $venue, array $intervals): void
    {
        $normalized = collect($intervals)
            ->map(function (array $interval) {
                return [
                    'day_of_week' => (int) $interval['day_of_week'],
                    'opens_at' => $this->normalizeTime($interval['opens_at']),
                    'closes_at' => $this->normalizeTime($interval['closes_at']),
                ];
            })
            ->sortBy(fn (array $interval) => sprintf('%d-%s', $interval['day_of_week'], $interval['opens_at']))
            ->values();

        $this->assertNoOverlaps($normalized);

        $venue->openingHours()->delete();

        foreach ($normalized as $interval) {
            $venue->openingHours()->create($interval);
        }
    }

    public function isOpen(Venue $venue, ?Carbon $moment = null): bool
    {
        $timezone = $venue->timezone ?: config('app.timezone');
        $moment = ($moment ?? now())->copy()->timezone($timezone);
        $time = $moment->format('H:i:s');
        $day = $moment->dayOfWeekIso;
        $previous = $day === 1 ? 7 : $day - 1;

        $intervals = $venue->relationLoaded('openingHours')
            ? $venue->openingHours
            : $venue->openingHours()->get();

        foreach ($intervals as $interval) {
            $opens = $this->normalizeTime((string) $interval->opens_at);
            $closes = $this->normalizeTime((string) $interval->closes_at);
            $overnight = $closes <= $opens;

            if ((int) $interval->day_of_week === $day) {
                if (! $overnight && $time >= $opens && $time < $closes) {
                    return true;
                }

                if ($overnight && $time >= $opens) {
                    return true;
                }
            }

            if ((int) $interval->day_of_week === $previous && $overnight && $time < $closes) {
                return true;
            }
        }

        return false;
    }

    /**
     * Filter uses the application timezone so pagination stays in SQL.
     * Venue cards still report open/closed in each venue timezone.
     */
    public function constrainOpen(Builder $query, ?Carbon $moment = null): Builder
    {
        $moment = ($moment ?? now())->copy()->timezone(config('app.timezone'));
        $time = $moment->format('H:i:s');
        $day = $moment->dayOfWeekIso;
        $previous = $day === 1 ? 7 : $day - 1;

        return $query->where(function (Builder $outer) use ($day, $previous, $time) {
            $outer->whereHas('openingHours', function (Builder $hours) use ($day, $time) {
                $hours->where('day_of_week', $day)
                    ->whereColumn('closes_at', '>', 'opens_at')
                    ->where('opens_at', '<=', $time)
                    ->where('closes_at', '>', $time);
            })->orWhereHas('openingHours', function (Builder $hours) use ($day, $time) {
                $hours->where('day_of_week', $day)
                    ->whereColumn('closes_at', '<=', 'opens_at')
                    ->where('opens_at', '<=', $time);
            })->orWhereHas('openingHours', function (Builder $hours) use ($previous, $time) {
                $hours->where('day_of_week', $previous)
                    ->whereColumn('closes_at', '<=', 'opens_at')
                    ->where('closes_at', '>', $time);
            });
        });
    }

    /**
     * @return array<int, array{day: int, label: string, intervals: array<int, array{opens_at: string, closes_at: string}>, closed: bool}>
     */
    public function weeklySchedule(Venue $venue): array
    {
        $grouped = $venue->openingHours->groupBy('day_of_week');
        $labels = [
            1 => 'Ponedjeljak',
            2 => 'Utorak',
            3 => 'Srijeda',
            4 => 'Četvrtak',
            5 => 'Petak',
            6 => 'Subota',
            7 => 'Nedjelja',
        ];

        $schedule = [];

        foreach ($labels as $day => $label) {
            /** @var Collection<int, OpeningHour> $rows */
            $rows = $grouped->get($day, collect());
            $schedule[] = [
                'day' => $day,
                'label' => $label,
                'closed' => $rows->isEmpty(),
                'intervals' => $rows->map(fn (OpeningHour $row) => [
                    'opens_at' => substr($this->normalizeTime((string) $row->opens_at), 0, 5),
                    'closes_at' => substr($this->normalizeTime((string) $row->closes_at), 0, 5),
                ])->values()->all(),
            ];
        }

        return $schedule;
    }

    /**
     * @param  Collection<int, array{day_of_week: int, opens_at: string, closes_at: string}>  $intervals
     */
    private function assertNoOverlaps(Collection $intervals): void
    {
        foreach ($intervals->groupBy('day_of_week') as $day => $rows) {
            $previousEnd = null;

            foreach ($rows->values() as $row) {
                if ($row['opens_at'] === $row['closes_at']) {
                    throw ValidationException::withMessages([
                        'intervals' => 'Vrijeme otvaranja i zatvaranja ne može biti isto.',
                    ]);
                }

                if ($row['closes_at'] <= $row['opens_at']) {
                    if ($rows->count() > 1) {
                        throw ValidationException::withMessages([
                            'intervals' => 'Noćni termin mora biti jedini interval tog dana.',
                        ]);
                    }

                    continue;
                }

                if ($previousEnd !== null && $row['opens_at'] < $previousEnd) {
                    throw ValidationException::withMessages([
                        'intervals' => 'Intervali za isti dan se preklapaju.',
                    ]);
                }

                $previousEnd = $row['closes_at'];
            }
        }
    }

    private function normalizeTime(string $value): string
    {
        $value = trim($value);

        if (preg_match('/^\d{2}:\d{2}$/', $value)) {
            return $value.':00';
        }

        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
            return $value;
        }

        return Carbon::parse($value)->format('H:i:s');
    }
}
