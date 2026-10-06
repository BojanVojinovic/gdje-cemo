<?php

namespace App\Services;

use App\Models\ShiftSwap;
use App\Models\StaffShift;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueStaff;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ShiftService
{
    public function __construct(private readonly NotificationService $notifications)
    {
    }

    public function create(Venue $venue, array $data): StaffShift
    {
        $this->assertStaff($venue, (int) $data['user_id']);
        $start = Carbon::parse($data['starts_at']);
        $end = Carbon::parse($data['ends_at']);
        $this->assertWindow($start, $end);
        $this->assertFree((int) $data['user_id'], $start, $end);

        $shift = StaffShift::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $data['user_id'],
            'role' => $data['role'] ?? null,
            'starts_at' => $start,
            'ends_at' => $end,
            'notes' => $data['notes'] ?? null,
            'status' => 'scheduled',
        ]);

        $worker = User::query()->find($shift->user_id);
        if ($worker) {
            $this->notify($worker, 'shift_assigned_title', 'shift_assigned_body', $shift);
        }

        return $shift->load('user', 'covering', 'venue', 'swaps');
    }

    public function update(StaffShift $shift, array $data): StaffShift
    {
        $start = Carbon::parse($data['starts_at'] ?? $shift->starts_at);
        $end = Carbon::parse($data['ends_at'] ?? $shift->ends_at);
        $this->assertWindow($start, $end);
        $userId = (int) ($data['user_id'] ?? $shift->user_id);
        $this->assertStaff($shift->venue, $userId);
        if ($userId !== (int) $shift->user_id) {
            $shift->covered_by_user_id = null;
            $shift->swaps()->where('status', 'pending')->update(['status' => 'cancelled', 'responded_at' => now()]);
        }
        $working = $shift->covered_by_user_id ?: $userId;
        $this->assertFree((int) $working, $start, $end, $shift->id);

        $shift->fill([
            'user_id' => $userId,
            'role' => array_key_exists('role', $data) ? $data['role'] : $shift->role,
            'starts_at' => $start,
            'ends_at' => $end,
            'notes' => array_key_exists('notes', $data) ? $data['notes'] : $shift->notes,
        ]);
        $shift->save();
        $worker = User::query()->find($shift->workingUserId());
        if ($worker) {
            $this->notify($worker, 'shift_updated_title', 'shift_updated_body', $shift);
        }

        return $shift->fresh(['user', 'covering', 'venue', 'swaps.fromUser', 'swaps.toUser']);
    }

    public function cancel(StaffShift $shift): void
    {
        $shift->update(['status' => 'cancelled']);
        $shift->swaps()->where('status', 'pending')->update(['status' => 'cancelled', 'responded_at' => now()]);
        foreach (array_unique(array_filter([$shift->user_id, $shift->covered_by_user_id])) as $userId) {
            $user = User::query()->find($userId);
            if ($user) {
                $this->notify($user, 'shift_cancelled_title', 'shift_cancelled_body', $shift);
            }
        }
    }

    public function requestSwap(StaffShift $shift, User $from, int $toUserId, ?string $note): ShiftSwap
    {
        $this->assertOpen($shift);
        if ($shift->workingUserId() !== $from->id) {
            abort(403);
        }
        if ($toUserId === $from->id) {
            throw ValidationException::withMessages(['to_user_id' => trans('messages.shift_self', [], $this->locale($from))]);
        }
        $this->assertStaff($shift->venue, $toUserId);
        if ($shift->swaps()->where('status', 'pending')->exists()) {
            throw ValidationException::withMessages(['shift' => trans('messages.shift_swap_open', [], $this->locale($from))]);
        }

        $swap = $shift->swaps()->create([
            'from_user_id' => $from->id,
            'to_user_id' => $toUserId,
            'status' => 'pending',
            'note' => $note,
        ]);
        $target = User::query()->find($toUserId);
        if ($target) {
            $this->notify($target, 'shift_swap_title', 'shift_swap_body', $shift, ['name' => $from->name]);
        }

        return $swap->load('fromUser', 'toUser', 'shift.venue');
    }

    public function accept(ShiftSwap $swap, User $actor): StaffShift
    {
        $swap->load('shift.venue', 'fromUser', 'toUser');
        if ($swap->status !== 'pending' || $swap->to_user_id !== $actor->id) {
            abort(403);
        }
        $shift = $swap->shift;
        $this->assertOpen($shift);
        $this->assertFree($actor->id, $shift->starts_at, $shift->ends_at, $shift->id);

        $shift->update(['covered_by_user_id' => $actor->id]);
        $swap->update(['status' => 'accepted', 'responded_at' => now()]);
        $this->notify($swap->fromUser, 'shift_swap_accepted_title', 'shift_swap_accepted_body', $shift, ['name' => $actor->name]);
        $ownerId = $shift->venue?->business?->owner_id;
        if ($ownerId) {
            $owner = User::query()->find($ownerId);
            if ($owner) {
                $this->notify($owner, 'shift_swap_accepted_title', 'shift_swap_accepted_body', $shift, ['name' => $actor->name]);
            }
        }

        return $shift->fresh(['user', 'covering', 'venue', 'swaps.fromUser', 'swaps.toUser']);
    }

    public function decline(ShiftSwap $swap, User $actor): void
    {
        $swap->load('shift', 'fromUser');
        if ($swap->status !== 'pending' || $swap->to_user_id !== $actor->id) {
            abort(403);
        }
        $swap->update(['status' => 'declined', 'responded_at' => now()]);
        if ($swap->fromUser) {
            $this->notify($swap->fromUser, 'shift_swap_declined_title', 'shift_swap_declined_body', $swap->shift, ['name' => $actor->name]);
        }
    }

    public function cancelSwap(ShiftSwap $swap, User $actor): void
    {
        if ($swap->status !== 'pending' || $swap->from_user_id !== $actor->id) {
            abort(403);
        }
        $swap->update(['status' => 'cancelled', 'responded_at' => now()]);
    }

    public function payload(StaffShift $shift): array
    {
        $shift->loadMissing('user', 'covering', 'venue:id,name,slug', 'swaps.fromUser', 'swaps.toUser');
        $pending = $shift->swaps->firstWhere('status', 'pending');

        return [
            'id' => $shift->id,
            'role' => $shift->role,
            'notes' => $shift->notes,
            'status' => $shift->status,
            'starts_at' => $shift->starts_at?->toIso8601String(),
            'ends_at' => $shift->ends_at?->toIso8601String(),
            'venue' => $shift->venue ? [
                'id' => $shift->venue->id,
                'name' => $shift->venue->name,
                'slug' => $shift->venue->slug,
            ] : null,
            'planned' => $this->person($shift->user),
            'covering' => $this->person($shift->covering),
            'working' => $this->person($shift->covering ?: $shift->user),
            'pending_swap' => $pending ? [
                'id' => $pending->id,
                'note' => $pending->note,
                'from' => $this->person($pending->fromUser),
                'to' => $this->person($pending->toUser),
            ] : null,
        ];
    }

    public function colleagues(Venue $venue, int $exceptUserId): Collection
    {
        return VenueStaff::query()
            ->with('user:id,first_name,last_name')
            ->where('venue_id', $venue->id)
            ->where('user_id', '!=', $exceptUserId)
            ->get()
            ->map(fn (VenueStaff $row) => [
                'id' => $row->user_id,
                'name' => $row->user?->name,
                'roles' => $row->roles ?? [],
            ])
            ->values();
    }

    private function person(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return ['id' => $user->id, 'name' => $user->name];
    }

    private function assertStaff(Venue $venue, int $userId): void
    {
        $exists = VenueStaff::query()->where('venue_id', $venue->id)->where('user_id', $userId)->exists();
        if (! $exists) {
            throw ValidationException::withMessages(['user_id' => 'That person is not on the staff of this place.']);
        }
    }

    private function assertWindow(Carbon $start, Carbon $end): void
    {
        if ($end->lessThanOrEqualTo($start) || $start->diffInMinutes($end) > 18 * 60) {
            throw ValidationException::withMessages(['ends_at' => 'A shift must end after it starts and last at most 18 hours.']);
        }
    }

    private function assertOpen(StaffShift $shift): void
    {
        if ($shift->status !== 'scheduled' || $shift->ends_at->isPast()) {
            throw ValidationException::withMessages(['shift' => 'This shift can no longer be changed.']);
        }
    }

    private function assertFree(int $userId, Carbon $start, Carbon $end, ?int $ignoreId = null): void
    {
        $clash = StaffShift::query()
            ->where('status', 'scheduled')
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where(function ($query) use ($userId) {
                $query->where(function ($inner) use ($userId) {
                    $inner->whereNull('covered_by_user_id')->where('user_id', $userId);
                })->orWhere('covered_by_user_id', $userId);
            })
            ->where('starts_at', '<', $end)
            ->where('ends_at', '>', $start)
            ->exists();
        if ($clash) {
            throw ValidationException::withMessages(['starts_at' => 'That person already has a shift in this time.']);
        }
    }

    private function notify(?User $user, string $titleKey, string $bodyKey, StaffShift $shift, array $extra = []): void
    {
        if (! $user) {
            return;
        }
        $shift->loadMissing('venue');
        $locale = $this->locale($user);
        $when = $shift->starts_at?->timezone('Europe/Podgorica')->format('d.m. H:i');
        $this->notifications->notify(
            $user,
            'SHIFT',
            trans('messages.'.$titleKey, [], $locale),
            trans('messages.'.$bodyKey, array_merge([
                'venue' => $shift->venue?->name,
                'when' => $when,
            ], $extra), $locale),
            ['shift_id' => $shift->id, 'venue_id' => $shift->venue_id],
        );
    }

    private function locale(User $user): string
    {
        return $user->locale === 'cnr' ? 'cnr' : 'en';
    }
}
