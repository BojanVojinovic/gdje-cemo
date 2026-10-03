<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\TableStatus;
use App\Models\Reservation;
use App\Models\TableCombination;
use App\Models\Venue;
use App\Models\VenueClosure;
use App\Models\VenueContent;
use App\Models\VenueReservationSetting;
use App\Models\VenueTable;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class AvailabilityService
{
    public function settings(Venue $venue): VenueReservationSetting
    {
        return VenueReservationSetting::query()->firstOrCreate(
            ['venue_id' => $venue->id],
            ['reminder_hours' => [24, 2]]
        );
    }

    /**
     * @return array{start: Carbon, end: Carbon, tables: Collection<int, array<string, mixed>>, combinations: Collection<int, array<string, mixed>>}
     */
    public function options(Venue $venue, Carbon $start, int $partySize): array
    {
        $settings = $this->settings($venue);
        $this->assertRequestWindow($venue, $settings, $start, $partySize);
        $end = $start->copy()->addMinutes($settings->duration_minutes);
        $blocked = $this->blockedTableIds($venue, $start, $end);

        $tables = VenueTable::query()
            ->with('zone:id,name')
            ->where('venue_id', $venue->id)
            ->where('is_active', true)
            ->where('is_reservable', true)
            ->get()
            ->filter(fn (VenueTable $table) => $this->fits($table->capacity_min, $table->capacity_max, $partySize, $settings))
            ->filter(fn (VenueTable $table) => ! in_array($table->status, [TableStatus::Unavailable, TableStatus::Maintenance, TableStatus::Closed], true))
            ->filter(fn (VenueTable $table) => ! in_array($table->id, $blocked, true))
            ->map(fn (VenueTable $table) => $this->presentTable($table))
            ->values();

        $combinations = TableCombination::query()
            ->with('tables.zone')
            ->where('venue_id', $venue->id)
            ->where('is_active', true)
            ->get()
            ->filter(fn (TableCombination $combination) => $this->fits($combination->capacity_min, $combination->capacity_max, $partySize, $settings))
            ->filter(function (TableCombination $combination) use ($blocked) {
                $ids = $combination->tables->pluck('id')->all();

                return $ids !== [] && count(array_intersect($ids, $blocked)) === 0
                    && $combination->tables->every(fn (VenueTable $table) => $table->is_active && $table->is_reservable);
            })
            ->map(fn (TableCombination $combination) => [
                'id' => $combination->id,
                'name' => $combination->name,
                'capacity_min' => $combination->capacity_min,
                'capacity_max' => $combination->capacity_max,
                'table_ids' => $combination->tables->pluck('id')->values(),
                'zone' => $combination->tables->first()?->zone?->name,
            ])
            ->values();

        return ['start' => $start, 'end' => $end, 'tables' => $tables, 'combinations' => $combinations];
    }

    public function assertBookable(Venue $venue, Carbon $start, int $partySize, array $tableIds, ?int $ignoreReservationId = null): Carbon
    {
        $settings = $this->settings($venue);
        $this->assertRequestWindow($venue, $settings, $start, $partySize);
        $end = $start->copy()->addMinutes($settings->duration_minutes);
        $blocked = $this->blockedTableIds($venue, $start, $end, $ignoreReservationId);

        if ($tableIds === [] || count(array_intersect($tableIds, $blocked)) > 0) {
            throw ValidationException::withMessages([
                'table_id' => 'Odabrani sto nije slobodan u tom terminu.',
            ]);
        }

        $tables = VenueTable::query()->where('venue_id', $venue->id)->whereIn('id', $tableIds)->get();

        if ($tables->count() !== count($tableIds)) {
            throw ValidationException::withMessages(['table_id' => 'Sto ne pripada ovom mjestu.']);
        }

        foreach ($tables as $table) {
            if (! $table->is_active || ! $table->is_reservable || in_array($table->status, [TableStatus::Unavailable, TableStatus::Maintenance, TableStatus::Closed], true)) {
                throw ValidationException::withMessages(['table_id' => 'Sto trenutno nije moguće rezervisati.']);
            }
        }

        $combination = null;
        if (count($tableIds) > 1) {
            $wanted = collect($tableIds)->map(fn ($id) => (int) $id)->sort()->values()->all();
            $combination = TableCombination::query()
                ->with('tables:id')
                ->where('venue_id', $venue->id)
                ->get()
                ->first(function (TableCombination $row) use ($wanted) {
                    return $row->tables->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all() === $wanted;
                });
        }

        $min = $combination?->capacity_min ?? ($tables->count() === 1 ? $tables->first()->capacity_min : $tables->sum('capacity_min'));
        $max = $combination?->capacity_max ?? ($tables->count() === 1 ? $tables->first()->capacity_max : $tables->sum('capacity_max'));

        if (! $this->fits($min, $max, $partySize, $settings)) {
            throw ValidationException::withMessages(['party_size' => 'Kapacitet stola ne odgovara broju gostiju.']);
        }

        return $end;
    }

    /**
     * @return array<int, int>
     */
    public function blockedTableIds(Venue $venue, Carbon $start, Carbon $end, ?int $ignoreReservationId = null): array
    {
        $settings = $this->settings($venue);
        $windowStart = $start->copy()->subMinutes($settings->buffer_minutes);
        $windowEnd = $end->copy()->addMinutes($settings->buffer_minutes);
        $statuses = [
            ReservationStatus::Pending->value,
            ReservationStatus::Confirmed->value,
            ReservationStatus::Seated->value,
        ];

        return Reservation::query()
            ->where('venue_id', $venue->id)
            ->whereIn('status', $statuses)
            ->when($ignoreReservationId, fn ($query) => $query->where('id', '!=', $ignoreReservationId))
            ->where('start_at', '<', $windowEnd)
            ->where('end_at', '>', $windowStart)
            ->get()
            ->flatMap(fn (Reservation $reservation) => $reservation->table_ids ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public function publicState(VenueTable $table, ?Reservation $covering = null): string
    {
        if (! $table->is_active || in_array($table->status, [TableStatus::Unavailable, TableStatus::Maintenance, TableStatus::Closed], true)) {
            return 'unavailable';
        }

        if (in_array($table->status, [TableStatus::Occupied, TableStatus::Ordering], true)) {
            return 'occupied';
        }

        if ($covering) {
            return 'reserved';
        }

        return 'available';
    }

    private function assertRequestWindow(Venue $venue, VenueReservationSetting $settings, Carbon $start, int $partySize): void
    {
        if (! $settings->enabled) {
            throw ValidationException::withMessages(['date' => 'Ovo mjesto trenutno ne prima rezervacije.']);
        }

        if ($partySize < $settings->min_party_size || $partySize > $settings->max_party_size) {
            throw ValidationException::withMessages(['party_size' => 'Broj gostiju je van dozvoljenog opsega.']);
        }

        $now = now()->timezone($venue->timezone ?: config('app.timezone'));
        $local = $start->copy()->timezone($venue->timezone ?: config('app.timezone'));

        if ($local->lt($now->copy()->addMinutes($settings->min_advance_minutes))) {
            throw ValidationException::withMessages(['start_at' => 'Rezervacija je preblizu. Odaberite kasniji termin.']);
        }

        if ($local->gt($now->copy()->addDays($settings->max_advance_days))) {
            throw ValidationException::withMessages(['start_at' => 'Rezervacija je predaleko unaprijed.']);
        }

        $end = $local->copy()->addMinutes($settings->duration_minutes);

        if (! $this->insideHours($venue, $local) || ! $this->insideHours($venue, $end->copy()->subMinute())) {
            throw ValidationException::withMessages(['start_at' => 'Termin je van radnog vremena.']);
        }

        $closed = VenueClosure::query()
            ->where('venue_id', $venue->id)
            ->where('blocks_reservations', true)
            ->where('starts_at', '<', $end)
            ->where('ends_at', '>', $local)
            ->exists();

        $privateEvent = VenueContent::query()
            ->where('venue_id', $venue->id)
            ->where('status', 'published')
            ->where('blocks_reservations', true)
            ->where('event_start_at', '<', $end)
            ->where('event_end_at', '>', $local)
            ->exists();

        if ($closed || $privateEvent) {
            throw ValidationException::withMessages(['start_at' => 'Mjesto je zatvoreno ili rezervisano za poseban događaj.']);
        }
    }

    private function insideHours(Venue $venue, Carbon $moment): bool
    {
        $local = $moment->copy()->timezone($venue->timezone ?: config('app.timezone'));
        $time = $local->format('H:i:s');
        $day = $local->dayOfWeekIso;
        $previous = $day === 1 ? 7 : $day - 1;
        $hours = $venue->relationLoaded('openingHours') ? $venue->openingHours : $venue->openingHours()->get();

        foreach ($hours as $interval) {
            $opens = substr((string) $interval->opens_at, 0, 8);
            $closes = substr((string) $interval->closes_at, 0, 8);
            $overnight = $closes <= $opens;

            if ((int) $interval->day_of_week === $day && ! $overnight && $time >= $opens && $time < $closes) {
                return true;
            }

            if ((int) $interval->day_of_week === $day && $overnight && $time >= $opens) {
                return true;
            }

            if ((int) $interval->day_of_week === $previous && $overnight && $time < $closes) {
                return true;
            }
        }

        return false;
    }

    private function fits(int $min, int $max, int $partySize, VenueReservationSetting $settings): bool
    {
        if ($partySize > $max) {
            return false;
        }

        if ($partySize < $min) {
            return $settings->allow_larger_tables;
        }

        return true;
    }

    private function presentTable(VenueTable $table): array
    {
        return [
            'id' => $table->id,
            'name' => $table->name,
            'zone' => $table->zone?->name,
            'zone_id' => $table->zone_id,
            'capacity_min' => $table->capacity_min,
            'capacity_max' => $table->capacity_max,
            'shape' => $table->shape?->value ?? $table->shape,
            'position_x' => $table->position_x,
            'position_y' => $table->position_y,
            'width' => $table->width,
            'height' => $table->height,
            'rotation' => $table->rotation,
        ];
    }
}
