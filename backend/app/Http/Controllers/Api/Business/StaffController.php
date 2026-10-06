<?php

namespace App\Http\Controllers\Api\Business;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueStaff;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StaffController extends Controller
{
    public function index(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);

        $rows = VenueStaff::query()->with('user:id,first_name,last_name,email')->where('venue_id', $venue->id)->get();

        return ApiResponse::success($rows->map(fn (VenueStaff $row) => [
            'id' => $row->id,
            'user_id' => $row->user_id,
            'name' => $row->user?->name,
            'email' => $row->user?->email,
            'roles' => $row->roles ?? [],
        ])->values());
    }

    public function store(Request $request, Venue $venue, NotificationService $notifications): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $this->validated($request);
        $user = User::query()->where('email', $data['email'])->where('is_active', true)->first();
        if (! $user) {
            throw ValidationException::withMessages(['email' => 'Nema naloga sa tom adresom. Osoba prvo treba da se registruje.']);
        }

        $row = VenueStaff::query()->updateOrCreate(
            ['user_id' => $user->id, 'venue_id' => $venue->id],
            ['business_id' => $venue->business_id, 'roles' => array_values($data['roles'])],
        );

        $labels = collect($row->roles)->map(fn (string $role) => $this->label($role))->implode(', ');
        $notifications->notify($user, 'STAFF_ASSIGNED', 'Osoblje', 'Dodijeljene su ti uloge na lokalu '.$venue->name.': '.$labels.'.', [
            'venue_id' => $venue->id,
        ]);

        return ApiResponse::success([
            'id' => $row->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $row->roles,
        ], 'Osoblje je sačuvano.', 201);
    }

    public function destroy(Request $request, Venue $venue, VenueStaff $venueStaff): JsonResponse
    {
        $this->authorize('update', $venue);
        if ($venueStaff->venue_id !== $venue->id) {
            abort(404);
        }
        $venueStaff->delete();

        return ApiResponse::success(null, 'Osoblje je uklonjeno.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['distinct', 'in:waiter,bar,kitchen,delivery'],
        ]);
    }

    private function label(string $role): string
    {
        return match ($role) {
            'waiter' => 'Konobar',
            'bar' => 'Šank',
            'delivery' => 'Dostava',
            default => 'Kuhinja',
        };
    }
}
