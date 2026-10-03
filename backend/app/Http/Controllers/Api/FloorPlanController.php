<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReservationStatus;
use App\Enums\TableShape;
use App\Enums\TableStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\TableCombination;
use App\Models\TableFeature;
use App\Models\TableQrCode;
use App\Models\Venue;
use App\Models\VenueClosure;
use App\Models\VenueFloorPlan;
use App\Models\VenueFollower;
use App\Models\VenueTable;
use App\Models\VenueZone;
use App\Services\AuditService;
use App\Services\AvailabilityService;
use App\Services\ImageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FloorPlanController extends Controller
{
    public function show(Request $request, Venue $venue, AvailabilityService $availability): JsonResponse
    {
        $user = $request->user('sanctum');
        Gate::forUser($user)->authorize('view', $venue);
        $plan = $this->plan($venue);
        $plan->load(['zones', 'tables.features', 'tables.zone', 'tables.qrCode']);
        $owner = $user && ($user->isAdmin() || $user->managesVenue($venue));
        $now = now();
        $covering = Reservation::query()
            ->where('venue_id', $venue->id)
            ->whereIn('status', [ReservationStatus::Pending->value, ReservationStatus::Confirmed->value, ReservationStatus::Seated->value])
            ->where('start_at', '<=', $now)
            ->where('end_at', '>', $now)
            ->get();

        return ApiResponse::success([
            'floor_plan' => $this->payload($plan, $owner),
            'tables' => $plan->tables->map(function (VenueTable $table) use ($availability, $covering, $owner) {
                $hit = $covering->first(fn (Reservation $reservation) => in_array($table->id, $reservation->table_ids ?? [], true));

                return $this->tablePayload($table, $availability->publicState($table, $hit), $owner);
            })->values(),
            'zones' => $plan->zones,
            'features' => TableFeature::query()->orderBy('name')->get(),
            'settings' => $availability->settings($venue),
            'combinations' => TableCombination::query()->with('tables:id,name')->where('venue_id', $venue->id)->get(),
            'closures' => $owner ? VenueClosure::query()->where('venue_id', $venue->id)->orderBy('starts_at')->get() : [],
            'following' => (bool) ($user && VenueFollower::query()->where('venue_id', $venue->id)->where('user_id', $user->id)->exists()),
        ]);
    }

    public function updatePlan(Request $request, Venue $venue, ImageService $images, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $venue);
        $plan = $this->plan($venue);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'canvas_width' => ['sometimes', 'integer', 'between:400,2400'],
            'canvas_height' => ['sometimes', 'integer', 'between:300,1600'],
            'background' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if ($request->file('background')) {
            $meta = $images->store($request->file('background'), 'floor-plans/'.$venue->id, 2000, 900, 600, 400);
            $images->delete($plan->background_path);
            $data['background_path'] = $meta['path'];
        }

        unset($data['background']);
        $plan->update($data + ['version' => $plan->version + 1]);
        $audit->record($request->user(), 'floor_plan.updated', $plan);

        return ApiResponse::success($this->payload($plan->refresh(), true), 'Tlocrt je sačuvan.');
    }

    public function storeZone(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $plan = $this->plan($venue);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);
        $zone = $plan->zones()->create([
            'venue_id' => $venue->id,
            'name' => $data['name'],
            'color' => $data['color'] ?? '#0e4c49',
            'sort_order' => (int) $plan->zones()->max('sort_order') + 1,
        ]);

        return ApiResponse::success($zone, 'Zona je dodata.', 201);
    }

    public function updateZone(Request $request, VenueZone $zone): JsonResponse
    {
        $this->authorize('update', $zone->floorPlan->venue);
        $zone->update($request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'color' => ['sometimes', 'string', 'max:20'],
        ]));

        return ApiResponse::success($zone->refresh(), 'Zona je sačuvana.');
    }

    public function destroyZone(Request $request, VenueZone $zone, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $zone->floorPlan->venue);
        $audit->record($request->user(), 'zone.deleted', $zone, ['name' => $zone->name]);
        $zone->delete();

        return ApiResponse::success(null, 'Zona je obrisana.');
    }

    public function storeTable(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $plan = $this->plan($venue);
        $table = $this->saveTable(new VenueTable(['venue_id' => $venue->id, 'floor_plan_id' => $plan->id]), $request);
        $this->qr($table);

        return ApiResponse::success($this->tablePayload($table->load('features', 'zone', 'qrCode'), 'available', true), 'Sto je dodat.', 201);
    }

    public function updateTable(Request $request, VenueTable $table): JsonResponse
    {
        $this->authorize('update', $table->venue);
        $table = $this->saveTable($table, $request);

        return ApiResponse::success($this->tablePayload($table->load('features', 'zone', 'qrCode'), $table->status->value, true), 'Sto je sačuvan.');
    }

    public function duplicateTable(Request $request, VenueTable $table): JsonResponse
    {
        $this->authorize('update', $table->venue);
        $copy = $table->replicate(['id']);
        $copy->name = $table->name.' kopija';
        $copy->position_x = $table->position_x + 24;
        $copy->position_y = $table->position_y + 24;
        $copy->status = TableStatus::Available;
        $copy->save();
        $copy->features()->sync($table->features()->pluck('table_features.id'));
        $this->qr($copy);

        return ApiResponse::success($this->tablePayload($copy->load('features', 'zone', 'qrCode'), 'available', true), 'Sto je dupliran.', 201);
    }

    public function destroyTable(Request $request, VenueTable $table, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $table->venue);
        $future = Reservation::query()
            ->whereJsonContains('table_ids', $table->id)
            ->whereIn('status', [ReservationStatus::Pending->value, ReservationStatus::Confirmed->value, ReservationStatus::Seated->value])
            ->where('end_at', '>', now())
            ->exists();

        if ($future) {
            throw ValidationException::withMessages(['table' => 'Sto ima buduće rezervacije. Možete ga privremeno isključiti.']);
        }

        $audit->record($request->user(), 'table.deleted', $table, ['name' => $table->name]);
        $table->delete();

        return ApiResponse::success(null, 'Sto je obrisan.');
    }

    public function layout(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $request->validate([
            'tables' => ['required', 'array', 'min:1'],
            'tables.*.id' => ['required', 'integer'],
            'tables.*.position_x' => ['required', 'numeric'],
            'tables.*.position_y' => ['required', 'numeric'],
            'tables.*.width' => ['required', 'numeric', 'min:48', 'max:400'],
            'tables.*.height' => ['required', 'numeric', 'min:48', 'max:400'],
            'tables.*.rotation' => ['required', 'numeric', 'between:0,359'],
        ]);

        $owned = VenueTable::query()->where('venue_id', $venue->id)->whereIn('id', collect($data['tables'])->pluck('id'))->get()->keyBy('id');

        foreach ($data['tables'] as $row) {
            $table = $owned->get($row['id']);
            if (! $table) {
                throw ValidationException::withMessages(['tables' => 'Raspored sadrži tuđi sto.']);
            }
            $table->update([
                'position_x' => $row['position_x'],
                'position_y' => $row['position_y'],
                'width' => $row['width'],
                'height' => $row['height'],
                'rotation' => $row['rotation'],
            ]);
        }

        $venue->floorPlans()->where('is_active', true)->increment('version');

        return ApiResponse::success(null, 'Raspored je sačuvan.');
    }

    public function regenerateQr(Request $request, VenueTable $table, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $table->venue);
        TableQrCode::query()->where('venue_table_id', $table->id)->update(['is_active' => false]);
        $code = $this->qr($table);
        $audit->record($request->user(), 'table.qr_regenerated', $table);

        return ApiResponse::success(['token' => $code->token], 'QR kod je osvježen.');
    }

    public function storeCombination(Request $request, Venue $venue): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'capacity_min' => ['required', 'integer', 'min:1', 'max:30'],
            'capacity_max' => ['required', 'integer', 'gte:capacity_min', 'max:40'],
            'table_ids' => ['required', 'array', 'min:2'],
            'table_ids.*' => ['integer', 'distinct'],
        ]);
        $count = VenueTable::query()->where('venue_id', $venue->id)->whereIn('id', $data['table_ids'])->count();
        if ($count !== count($data['table_ids'])) {
            throw ValidationException::withMessages(['table_ids' => 'Svi stolovi moraju pripadati ovom mjestu.']);
        }
        $combination = TableCombination::query()->create([
            'venue_id' => $venue->id,
            'name' => $data['name'],
            'capacity_min' => $data['capacity_min'],
            'capacity_max' => $data['capacity_max'],
        ]);
        $combination->tables()->sync($data['table_ids']);

        return ApiResponse::success($combination->load('tables:id,name'), 'Kombinacija stolova je sačuvana.', 201);
    }

    public function updateSettings(Request $request, Venue $venue, AvailabilityService $availability, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $venue);
        $settings = $availability->settings($venue);
        $settings->update($request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'min_advance_minutes' => ['sometimes', 'integer', 'min:0', 'max:10080'],
            'max_advance_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'duration_minutes' => ['sometimes', 'integer', 'min:30', 'max:480'],
            'buffer_minutes' => ['sometimes', 'integer', 'min:0', 'max:180'],
            'min_party_size' => ['sometimes', 'integer', 'min:1', 'max:30'],
            'max_party_size' => ['sometimes', 'integer', 'min:1', 'max:40'],
            'cancellation_deadline_minutes' => ['sometimes', 'integer', 'min:0', 'max:10080'],
            'auto_confirm' => ['sometimes', 'boolean'],
            'allow_table_selection' => ['sometimes', 'boolean'],
            'auto_assign' => ['sometimes', 'boolean'],
            'allow_larger_tables' => ['sometimes', 'boolean'],
            'waitlist_enabled' => ['sometimes', 'boolean'],
            'reminder_hours' => ['sometimes', 'array'],
            'reminder_hours.*' => ['integer', 'min:1', 'max:168'],
        ]));
        $audit->record($request->user(), 'reservation_settings.updated', $venue);

        return ApiResponse::success($settings->refresh(), 'Podešavanja rezervacija su sačuvana.');
    }

    public function storeClosure(Request $request, Venue $venue, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $venue);
        $data = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'reason' => ['required', 'string', 'max:160'],
            'blocks_reservations' => ['sometimes', 'boolean'],
        ]);
        $closure = VenueClosure::query()->create([
            'venue_id' => $venue->id,
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
            'reason' => $data['reason'],
            'blocks_reservations' => $data['blocks_reservations'] ?? true,
        ]);
        $audit->record($request->user(), 'closure.created', $venue, ['closure_id' => $closure->id]);

        return ApiResponse::success($closure, 'Zatvaranje je sačuvano.', 201);
    }

    public function destroyClosure(Request $request, VenueClosure $venueClosure, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $venueClosure->venue);
        $audit->record($request->user(), 'closure.deleted', $venueClosure->venue, ['closure_id' => $venueClosure->id]);
        $venueClosure->delete();

        return ApiResponse::success(null, 'Zatvaranje je obrisano.');
    }

    private function plan(Venue $venue): VenueFloorPlan
    {
        return VenueFloorPlan::query()->firstOrCreate(
            ['venue_id' => $venue->id, 'is_active' => true],
            ['name' => 'Glavni tlocrt']
        );
    }

    private function saveTable(VenueTable $table, Request $request): VenueTable
    {
        $data = $request->validate([
            'zone_id' => ['nullable', 'integer'],
            'name' => [$table->exists ? 'sometimes' : 'required', 'string', 'max:40'],
            'capacity_min' => ['sometimes', 'integer', 'min:1', 'max:30'],
            'capacity_max' => ['sometimes', 'integer', 'min:1', 'max:40'],
            'shape' => ['sometimes', Rule::enum(TableShape::class)],
            'position_x' => ['sometimes', 'numeric'],
            'position_y' => ['sometimes', 'numeric'],
            'width' => ['sometimes', 'numeric', 'min:48', 'max:400'],
            'height' => ['sometimes', 'numeric', 'min:48', 'max:400'],
            'rotation' => ['sometimes', 'numeric', 'between:0,359'],
            'status' => ['sometimes', Rule::enum(TableStatus::class)],
            'is_reservable' => ['sometimes', 'boolean'],
            'is_orderable' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'feature_ids' => ['sometimes', 'array'],
            'feature_ids.*' => ['integer', 'exists:table_features,id'],
        ]);

        if (isset($data['zone_id'])) {
            $zoneOk = VenueZone::query()->where('venue_id', $table->venue_id ?? $request->route('venue')->id)->where('id', $data['zone_id'])->exists();
            if (! $zoneOk) {
                throw ValidationException::withMessages(['zone_id' => 'Zona ne pripada ovom mjestu.']);
            }
        }

        if (isset($data['capacity_min'], $data['capacity_max']) && $data['capacity_max'] < $data['capacity_min']) {
            throw ValidationException::withMessages(['capacity_max' => 'Maksimalan kapacitet mora biti veći ili jednak minimalnom.']);
        }

        $features = $data['feature_ids'] ?? null;
        unset($data['feature_ids']);
        $table->fill($data);
        $table->save();
        if (is_array($features)) {
            $table->features()->sync($features);
        }

        return $table;
    }

    private function qr(VenueTable $table): TableQrCode
    {
        return TableQrCode::query()->create([
            'venue_table_id' => $table->id,
            'token' => Str::random(40),
            'is_active' => true,
        ]);
    }

    private function payload(VenueFloorPlan $plan, bool $owner): array
    {
        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'background_url' => $plan->backgroundUrl(),
            'canvas_width' => $plan->canvas_width,
            'canvas_height' => $plan->canvas_height,
            'version' => $owner ? $plan->version : null,
        ];
    }

    private function tablePayload(VenueTable $table, string $publicState, bool $owner): array
    {
        return [
            'id' => $table->id,
            'name' => $table->name,
            'zone_id' => $table->zone_id,
            'zone' => $table->zone?->name,
            'capacity_min' => $table->capacity_min,
            'capacity_max' => $table->capacity_max,
            'shape' => $table->shape?->value ?? $table->shape,
            'position_x' => (float) $table->position_x,
            'position_y' => (float) $table->position_y,
            'width' => (float) $table->width,
            'height' => (float) $table->height,
            'rotation' => (float) $table->rotation,
            'status' => $owner ? ($table->status?->value ?? $table->status) : null,
            'public_state' => $publicState,
            'is_reservable' => $table->is_reservable,
            'is_orderable' => $table->is_orderable,
            'is_active' => $table->is_active,
            'features' => $table->relationLoaded('features') ? $table->features->map(fn ($feature) => ['id' => $feature->id, 'name' => $feature->name, 'slug' => $feature->slug])->values() : [],
            'qr_token' => $owner ? $table->qrCode?->token : null,
        ];
    }
}
