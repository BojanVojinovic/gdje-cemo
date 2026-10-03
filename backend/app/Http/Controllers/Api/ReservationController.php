<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Venue;
use App\Services\AvailabilityService;
use App\Services\ReservationService;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReservationController extends Controller
{
    public function availability(Request $request, Venue $venue, AvailabilityService $availability): JsonResponse
    {
        $this->authorize('view', $venue);
        $data = $request->validate([
            'start_at' => ['required', 'date'],
            'party_size' => ['required', 'integer', 'min:1', 'max:40'],
            'zone_id' => ['nullable', 'integer'],
        ]);
        $start = Carbon::parse($data['start_at'])->timezone($venue->timezone ?: config('app.timezone'));
        $options = $availability->options($venue, $start, (int) $data['party_size']);
        $tables = $options['tables'];
        if (! empty($data['zone_id'])) {
            $tables = $tables->where('zone_id', (int) $data['zone_id'])->values();
        }

        return ApiResponse::success([
            'start_at' => $options['start']->toIso8601String(),
            'end_at' => $options['end']->toIso8601String(),
            'allow_table_selection' => $availability->settings($venue)->allow_table_selection,
            'tables' => $tables->values(),
            'combinations' => $options['combinations'],
        ]);
    }

    public function store(Request $request, Venue $venue, ReservationService $reservations): JsonResponse
    {
        $data = $request->validate([
            'start_at' => ['required', 'date'],
            'party_size' => ['required', 'integer', 'min:1', 'max:40'],
            'table_id' => ['nullable', 'integer'],
            'combination_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        $start = Carbon::parse($data['start_at']);
        $reservation = $reservations->create(
            $request->user(),
            $venue,
            $start,
            (int) $data['party_size'],
            $data['table_id'] ?? null,
            $data['combination_id'] ?? null,
            $data['notes'] ?? null,
        );

        return ApiResponse::success($this->present($reservation, true), 'Rezervacija je sačuvana.', 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $rows = Reservation::query()->with('venue:id,name,slug,city')->where('user_id', $request->user()->id)->latest('start_at')->paginate(20);

        return ApiResponse::paginated($rows, \App\Http\Resources\ReservationResource::class);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Reservation::query()->with(['venue:id,name,slug', 'user:id,first_name,last_name,phone'])->latest('start_at');
        $this->scopeOwned($request, $query);
        if ($date = $request->query('date')) {
            $query->whereDate('start_at', $date);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($venue = $request->integer('venue_id')) {
            $query->where('venue_id', $venue);
        }

        return ApiResponse::paginated($query->paginate(30), \App\Http\Resources\ReservationResource::class);
    }

    public function transition(Request $request, Reservation $reservation, ReservationService $reservations): JsonResponse
    {
        $this->guard($request, $reservation, customerCancel: false);
        $data = $request->validate([
            'status' => ['required', Rule::enum(ReservationStatus::class)],
            'note' => ['nullable', 'string', 'max:300'],
        ]);
        $updated = $reservations->transition($request->user(), $reservation, ReservationStatus::from($data['status']), $data['note'] ?? null);

        return ApiResponse::success($this->present($updated->load('history'), true), 'Status rezervacije je sačuvan.');
    }

    public function cancel(Request $request, Reservation $reservation, ReservationService $reservations): JsonResponse
    {
        $this->guard($request, $reservation, customerCancel: true);
        $updated = $reservations->transition($request->user(), $reservation, ReservationStatus::Cancelled, 'Otkazao korisnik.');

        return ApiResponse::success($this->present($updated, true), 'Rezervacija je otkazana.');
    }

    public function walkIn(Request $request, Venue $venue, ReservationService $reservations): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $request->validate([
            'table_id' => ['required', 'integer'],
            'party_size' => ['required', 'integer', 'min:1', 'max:40'],
            'guest_name' => ['nullable', 'string', 'max:120'],
        ]);
        $reservation = $reservations->walkIn($request->user(), $venue, (int) $data['table_id'], (int) $data['party_size'], $data['guest_name'] ?? null);

        return ApiResponse::success($this->present($reservation, true), 'Gost je smješten.', 201);
    }

    public function waitlist(Request $request, Venue $venue, ReservationService $reservations): JsonResponse
    {
        $data = $request->validate([
            'start_at' => ['required', 'date'],
            'party_size' => ['required', 'integer', 'min:1', 'max:40'],
            'flexibility_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
        ]);
        $entry = $reservations->joinWaitlist(
            $request->user(),
            $venue,
            Carbon::parse($data['start_at']),
            (int) $data['party_size'],
            (int) ($data['flexibility_minutes'] ?? 60),
        );

        return ApiResponse::success($entry, 'Na listi ste čekanja.', 201);
    }

    private function guard(Request $request, Reservation $reservation, bool $customerCancel): void
    {
        $user = $request->user();
        $owns = $user->managesVenue($reservation->venue);
        $self = $reservation->user_id === $user->id;

        if ($customerCancel && $self) {
            return;
        }

        if (! $owns) {
            throw ValidationException::withMessages(['status' => 'Nemate dozvolu za ovu rezervaciju.']);
        }
    }

    private function scopeOwned(Request $request, $query): void
    {
        if ($request->user()->isAdmin()) {
            return;
        }

        $ids = $request->user()->businesses()->pluck('businesses.id');
        $query->whereHas('venue', fn ($venue) => $venue->whereIn('business_id', $ids));
    }

    private function present(Reservation $reservation, bool $detailed): array
    {
        return (new \App\Http\Resources\ReservationResource($reservation))->resolve();
    }
}
