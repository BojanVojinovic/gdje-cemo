<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\TableStatus;
use App\Models\DiningSession;
use App\Models\Reservation;
use App\Models\ReservationStatusHistory;
use App\Models\TableCombination;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueTable;
use App\Models\WaitlistEntry;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationService
{
    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {}

    public function create(User $user, Venue $venue, Carbon $start, int $partySize, ?int $tableId, ?int $combinationId, ?string $notes): Reservation
    {
        $settings = $this->availability->settings($venue);
        $assignment = $this->resolveTables($venue, $tableId, $combinationId, $start, $partySize, $settings->allow_table_selection, $settings->auto_assign);

        return DB::transaction(function () use ($user, $venue, $start, $partySize, $notes, $assignment, $settings) {
            VenueTable::query()->whereIn('id', $assignment['ids'])->lockForUpdate()->get();
            $end = $this->availability->assertBookable($venue, $start, $partySize, $assignment['ids']);
            $status = $settings->auto_confirm ? ReservationStatus::Confirmed : ReservationStatus::Pending;

            $reservation = Reservation::query()->create([
                'venue_id' => $venue->id,
                'venue_table_id' => $assignment['table']?->id,
                'table_combination_id' => $assignment['combination']?->id,
                'user_id' => $user->id,
                'table_ids' => $assignment['ids'],
                'party_size' => $partySize,
                'start_at' => $start,
                'end_at' => $end,
                'status' => $status,
                'source' => 'online',
                'notes' => $notes,
                'guest_name' => $user->name,
                'guest_phone' => $user->phone,
                'table_name_snapshot' => $assignment['name'],
                'zone_name_snapshot' => $assignment['zone'],
                'capacity_snapshot' => $assignment['capacity'],
            ]);

            $this->history($reservation, null, $status, $user, 'Kreirana rezervacija.');
            $this->audit->record($user, 'reservation.created', $reservation, ['status' => $status->value]);

            if ($status === ReservationStatus::Confirmed) {
                $this->notifications->notify($user, 'RESERVATION_CONFIRMED', 'Rezervacija je potvrđena', $venue->name.' · '.$assignment['name'].' · '.$start->timezone($venue->timezone ?: config('app.timezone'))->format('d.m.Y. H:i'), [
                    'reservation_id' => $reservation->id,
                    'venue_slug' => $venue->slug,
                ]);
            }

            return $reservation->load('venue:id,name,slug');
        });
    }

    public function transition(User $actor, Reservation $reservation, ReservationStatus $status, ?string $note = null): Reservation
    {
        return DB::transaction(function () use ($actor, $reservation, $status, $note) {
            $reservation = Reservation::query()->lockForUpdate()->findOrFail($reservation->id);
            $from = $reservation->status;

            if ($status === ReservationStatus::Cancelled && $reservation->user_id === $actor->id && ! $actor->managesVenue($reservation->venue)) {
                $settings = $this->availability->settings($reservation->venue);
                $deadline = $reservation->start_at->copy()->subMinutes($settings->cancellation_deadline_minutes);
                if (now()->greaterThan($deadline)) {
                    throw ValidationException::withMessages(['status' => 'Rok za otkazivanje je prošao.']);
                }
            }

            $reservation->update([
                'status' => $status,
                'seated_at' => $status === ReservationStatus::Seated ? now() : $reservation->seated_at,
            ]);
            $this->history($reservation, $from, $status, $actor, $note);
            $this->audit->record($actor, 'reservation.'.$status->value, $reservation, ['from' => $from?->value]);

            if ($status === ReservationStatus::Seated) {
                $this->openSession($reservation, $actor);
                VenueTable::query()->whereIn('id', $reservation->table_ids ?? [])->update(['status' => TableStatus::Occupied->value]);
            }

            if (in_array($status, [ReservationStatus::Completed, ReservationStatus::Cancelled, ReservationStatus::NoShow, ReservationStatus::Rejected], true)) {
                DiningSession::query()->where('reservation_id', $reservation->id)->where('status', 'active')->update([
                    'status' => 'closed',
                    'closed_at' => now(),
                ]);
                VenueTable::query()->whereIn('id', $reservation->table_ids ?? [])->whereIn('status', [
                    TableStatus::Occupied->value,
                    TableStatus::Ordering->value,
                    TableStatus::Reserved->value,
                ])->update(['status' => TableStatus::Available->value]);
            }

            if ($reservation->user && in_array($status, [ReservationStatus::Confirmed, ReservationStatus::Rejected, ReservationStatus::Cancelled], true)) {
                $type = $status === ReservationStatus::Confirmed ? 'RESERVATION_CONFIRMED' : 'RESERVATION_CANCELLED';
                $this->notifications->notify($reservation->user, $type, 'Status rezervacije', $reservation->table_name_snapshot.' je sada '.$status->value.'.', [
                    'reservation_id' => $reservation->id,
                ]);
            }

            if (in_array($status, [ReservationStatus::Cancelled, ReservationStatus::Rejected, ReservationStatus::NoShow], true)) {
                $this->offerWaitlist($reservation->venue, $reservation->start_at, $reservation->party_size);
            }

            return $reservation->refresh();
        });
    }

    public function walkIn(User $actor, Venue $venue, int $tableId, int $partySize, ?string $guestName): Reservation
    {
        $table = VenueTable::query()->where('venue_id', $venue->id)->findOrFail($tableId);
        $start = now();
        $reservation = DB::transaction(function () use ($actor, $venue, $table, $partySize, $guestName, $start) {
            $table = VenueTable::query()->with('zone')->lockForUpdate()->findOrFail($table->id);
            $end = $start->copy()->addMinutes($this->availability->settings($venue)->duration_minutes);
            $blocked = $this->availability->blockedTableIds($venue, $start, $end);
            if (in_array($table->id, $blocked, true)) {
                throw ValidationException::withMessages(['table_id' => 'Sto je već zauzet.']);
            }

            $created = Reservation::query()->create([
                'venue_id' => $venue->id,
                'venue_table_id' => $table->id,
                'user_id' => null,
                'table_ids' => [$table->id],
                'party_size' => $partySize,
                'start_at' => $start,
                'end_at' => $end,
                'status' => ReservationStatus::Seated,
                'source' => 'walk_in',
                'guest_name' => $guestName ?: 'Gost bez rezervacije',
                'table_name_snapshot' => $table->name,
                'zone_name_snapshot' => $table->zone?->name,
                'capacity_snapshot' => $table->capacity_min.'–'.$table->capacity_max,
                'seated_at' => $start,
            ]);
            $this->history($created, null, ReservationStatus::Seated, $actor, 'Dolazak bez rezervacije.');
            $this->openSession($created, $actor);
            $table->update(['status' => TableStatus::Occupied]);
            $this->audit->record($actor, 'reservation.walk_in', $created);

            return $created;
        });

        return $reservation;
    }

    public function joinWaitlist(User $user, Venue $venue, Carbon $start, int $partySize, int $flexibility): WaitlistEntry
    {
        $settings = $this->availability->settings($venue);
        if (! $settings->waitlist_enabled) {
            throw ValidationException::withMessages(['party_size' => 'Lista čekanja nije uključena.']);
        }

        return WaitlistEntry::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'party_size' => $partySize,
            'preferred_start' => $start,
            'flexibility_minutes' => $flexibility,
            'status' => 'waiting',
        ]);
    }

    private function offerWaitlist(Venue $venue, Carbon $start, int $partySize): void
    {
        $entry = WaitlistEntry::query()
            ->where('venue_id', $venue->id)
            ->where('status', 'waiting')
            ->where('party_size', '<=', $partySize)
            ->whereBetween('preferred_start', [$start->copy()->subHours(3), $start->copy()->addHours(3)])
            ->orderBy('created_at')
            ->first();

        if (! $entry) {
            return;
        }

        $entry->update(['status' => 'notified', 'notified_at' => now()]);
        $this->notifications->notify($entry->user, 'RESERVATION_CONFIRMED', 'Oslobodio se sto', 'U '.$venue->name.' ima mjesta oko '.$start->timezone($venue->timezone ?: config('app.timezone'))->format('H:i').'.', [
            'venue_slug' => $venue->slug,
            'waitlist_id' => $entry->id,
        ]);
    }

    private function openSession(Reservation $reservation, User $actor): DiningSession
    {
        $existing = DiningSession::query()->where('reservation_id', $reservation->id)->where('status', 'active')->first();
        if ($existing) {
            return $existing;
        }

        return DiningSession::query()->create([
            'venue_id' => $reservation->venue_id,
            'venue_table_id' => $reservation->venue_table_id,
            'reservation_id' => $reservation->id,
            'user_id' => $reservation->user_id,
            'party_size' => $reservation->party_size,
            'status' => 'active',
            'table_name_snapshot' => $reservation->table_name_snapshot,
            'zone_name_snapshot' => $reservation->zone_name_snapshot,
            'opened_at' => now(),
        ]);
    }

    /**
     * @return array{ids: array<int, int>, table: ?VenueTable, combination: ?TableCombination, name: string, zone: ?string, capacity: string}
     */
    private function resolveTables(Venue $venue, ?int $tableId, ?int $combinationId, Carbon $start, int $partySize, bool $allowSelection, bool $autoAssign): array
    {
        if (! $allowSelection || ($tableId === null && $combinationId === null)) {
            if (! $autoAssign) {
                throw ValidationException::withMessages(['table_id' => 'Mjesto dodjeljuje sto, ali automatska dodjela nije uključena.']);
            }

            $options = $this->availability->options($venue, $start, $partySize);
            $table = $options['tables']->sortBy('capacity_max')->first();
            if (! $table) {
                throw ValidationException::withMessages(['party_size' => 'Nema slobodnog stola za ovaj termin.']);
            }
            $model = VenueTable::query()->with('zone')->findOrFail($table['id']);

            return $this->snapshot([$model], null);
        }

        if ($combinationId) {
            $combination = TableCombination::query()->with('tables.zone')->where('venue_id', $venue->id)->findOrFail($combinationId);

            return $this->snapshot($combination->tables->all(), $combination);
        }

        $table = VenueTable::query()->with('zone')->where('venue_id', $venue->id)->findOrFail($tableId);

        return $this->snapshot([$table], null);
    }

    /**
     * @param  array<int, VenueTable>  $tables
     * @return array{ids: array<int, int>, table: ?VenueTable, combination: ?TableCombination, name: string, zone: ?string, capacity: string}
     */
    private function snapshot(array $tables, ?TableCombination $combination): array
    {
        $models = collect($tables);

        return [
            'ids' => $models->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'table' => $combination ? null : $models->first(),
            'combination' => $combination,
            'name' => $combination?->name ?? $models->first()->name,
            'zone' => $models->first()?->zone?->name,
            'capacity' => ($combination?->capacity_min ?? $models->first()->capacity_min).'–'.($combination?->capacity_max ?? $models->first()->capacity_max),
        ];
    }

    private function history(Reservation $reservation, ?ReservationStatus $from, ReservationStatus $to, ?User $actor, ?string $note): void
    {
        ReservationStatusHistory::query()->create([
            'reservation_id' => $reservation->id,
            'actor_id' => $actor?->id,
            'from_status' => $from?->value,
            'to_status' => $to->value,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}
