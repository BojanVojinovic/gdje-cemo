<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReservationStatus;
use App\Enums\TableStatus;
use App\Http\Controllers\Controller;
use App\Models\DiningSession;
use App\Models\DiningSessionGuest;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\TableQrCode;
use App\Models\TableServiceRequest;
use App\Models\User;
use App\Models\VenueStaff;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Services\ReservationService;
use App\Services\TableOrderGuard;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DiningController extends Controller
{
    public function scan(string $token): JsonResponse
    {
        $code = TableQrCode::query()->with('table.venue', 'table.zone')->where('token', $token)->where('is_active', true)->firstOrFail();
        $table = $code->table;
        $session = DiningSession::query()->where('venue_table_id', $table->id)->where('status', 'active')->first();

        return ApiResponse::success([
            'table' => [
                'id' => $table->id,
                'name' => $table->name,
                'zone' => $table->zone?->name,
                'is_orderable' => $table->is_orderable && $table->is_active,
            ],
            'venue' => [
                'id' => $table->venue->id,
                'name' => $table->venue->name,
                'slug' => $table->venue->slug,
            ],
            'session_id' => $session?->id,
        ]);
    }

    public function openSession(Request $request, string $token): JsonResponse
    {
        $actor = $this->actor($request);
        $code = TableQrCode::query()->with('table.zone', 'table.venue')->where('token', $token)->where('is_active', true)->firstOrFail();
        $table = $code->table;
        if (! $table->is_active) {
            throw ValidationException::withMessages(['table' => 'Ovaj sto trenutno nije dostupan.']);
        }

        $session = DiningSession::query()->where('venue_table_id', $table->id)->where('status', 'active')->first();
        $plain = $request->filled('guest_token') ? (string) $request->input('guest_token') : null;
        $guest = ($session && $plain) ? $this->findGuest($session, $plain) : null;

        if (! $session) {
            $reservation = $actor
                ? Reservation::query()
                    ->where('user_id', $actor->id)
                    ->where('status', ReservationStatus::Seated)
                    ->whereJsonContains('table_ids', $table->id)
                    ->first()
                : null;
            $session = DiningSession::query()->create([
                'venue_id' => $table->venue_id,
                'venue_table_id' => $table->id,
                'reservation_id' => $reservation?->id,
                'user_id' => $actor?->id,
                'party_size' => $reservation?->party_size ?? 1,
                'status' => 'active',
                'table_name_snapshot' => $table->name,
                'zone_name_snapshot' => $table->zone?->name,
                'opened_at' => now(),
            ]);
            $table->update(['status' => TableStatus::Occupied]);
        } elseif ($actor && ! $session->user_id) {
            $session->update(['user_id' => $actor->id]);
        }

        if (! $guest) {
            $mintKey = 'table-guests:'.$table->id;
            if ((int) Cache::get($mintKey, 0) >= 6) {
                throw ValidationException::withMessages(['table' => 'Previše uređaja je povezano na ovaj sto. Pozovite osoblje.']);
            }
            $plain = Str::random(48);
            DiningSessionGuest::query()->create([
                'dining_session_id' => $session->id,
                'token_hash' => hash('sha256', $plain),
            ]);
            Cache::put($mintKey, (int) Cache::get($mintKey, 0) + 1, now()->addMinutes(10));
        }

        return ApiResponse::success([
            'session_id' => $session->id,
            'guest_token' => $plain,
            'table_name' => $session->table_name_snapshot,
        ], 'Sesija je otvorena.');
    }

    public function order(Request $request, DiningSession $session, TableOrderGuard $guard, NotificationService $notifications): JsonResponse
    {
        if ($session->status !== 'active') {
            throw ValidationException::withMessages(['session' => 'Sesija je zatvorena.']);
        }
        $table = $session->table;
        if (! $table || ! $table->is_orderable || ! $table->is_active) {
            throw ValidationException::withMessages(['items' => 'Ovaj sto trenutno ne prima narudžbine.']);
        }

        $actor = $this->actor($request);
        $guest = $this->resolveGuest($request, $session);
        $allowed = $guest
            || ($actor && $session->user_id === $actor->id)
            || ($actor && $session->reservation?->user_id === $actor->id)
            || ($actor && $actor->managesVenue($session->venue));
        if (! $allowed) {
            abort(403, 'Ova sesija pripada drugom stolu.');
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
            'guest_token' => ['nullable', 'string', 'max:80'],
            'items' => ['required', 'array', 'min:1', 'max:10'],
            'items.*.menu_item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:8'],
        ]);
        $totalQty = array_sum(array_column($data['items'], 'quantity'));
        $guard->assert(
            $guest ? 'g'.$guest->id : ($actor ? 'u'.$actor->id : 'ip'.$request->ip()),
            (int) $session->venue_table_id,
            (string) $request->ip(),
            count($data['items']),
            $totalQty,
            $session->orders()->where('status', 'pending')->count(),
        );

        $order = DB::transaction(function () use ($session, $data, $actor) {
            $order = Order::query()->create([
                'dining_session_id' => $session->id,
                'venue_id' => $session->venue_id,
                'user_id' => $actor?->id,
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'table_name_snapshot' => $session->table_name_snapshot,
            ]);
            foreach ($data['items'] as $row) {
                $item = MenuItem::query()
                    ->with('category')
                    ->whereHas('category.menu', fn ($menu) => $menu->where('venue_id', $session->venue_id))
                    ->find($row['menu_item_id']);
                if (! $item || ! $item->is_available) {
                    throw ValidationException::withMessages(['items' => 'Stavka nije dostupna na meniju ovog mjesta.']);
                }
                $order->items()->create([
                    'menu_item_id' => $item->id,
                    'name_snapshot' => $item->name,
                    'price_snapshot' => $item->price,
                    'quantity' => $row['quantity'],
                    'station' => $item->category?->station === 'bar' ? 'bar' : 'kitchen',
                ]);
            }
            $session->table?->update(['status' => TableStatus::Ordering]);

            return $order->load('items');
        });

        $guard->remember(
            $guest ? 'g'.$guest->id : ($actor ? 'u'.$actor->id : 'ip'.$request->ip()),
            (int) $session->venue_table_id,
            (string) $request->ip(),
        );
        $this->notifyOrderStaff($order, $notifications);

        return ApiResponse::success($order, 'Narudžbina je poslata.', 201);
    }

    public function service(Request $request, DiningSession $session, NotificationService $notifications): JsonResponse
    {
        if ($session->status !== 'active') {
            throw ValidationException::withMessages(['session' => 'Sesija je zatvorena.']);
        }

        $data = $request->validate([
            'type' => ['required', 'in:waiter,bill'],
            'guest_token' => ['required', 'string', 'max:80'],
        ]);
        $guest = $this->resolveGuest($request, $session);
        if (! $guest) {
            throw ValidationException::withMessages(['guest_token' => 'Skenirajte QR kod ponovo.']);
        }
        if ($data['type'] === 'bill' && ! $session->orders()->where('status', '!=', 'cancelled')->exists()) {
            throw ValidationException::withMessages(['type' => 'Nema stavki za naplatu.']);
        }

        $ipKey = 'table-service:'.$request->ip().':'.$session->venue_table_id.':'.$data['type'];
        $created = false;
        $row = DB::transaction(function () use ($session, $guest, $data, $request, $ipKey, &$created) {
            $open = TableServiceRequest::query()
                ->where('dining_session_id', $session->id)
                ->where('type', $data['type'])
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();
            if ($open) {
                return $open;
            }

            $stamp = $data['type'] === 'waiter' ? $guest->last_waiter_at : $guest->last_bill_at;
            $minutes = $data['type'] === 'waiter' ? 3 : 5;
            if ($stamp && $stamp->gt(now()->subMinutes($minutes))) {
                throw ValidationException::withMessages(['type' => 'Konobar je već obaviješten. Sačekajte malo prije novog poziva.']);
            }
            if ((int) Cache::get($ipKey, 0) >= 4) {
                throw ValidationException::withMessages(['type' => 'Previše poziva sa ovog uređaja. Sačekajte malo.']);
            }

            $created = true;
            $guest->update([
                $data['type'] === 'waiter' ? 'last_waiter_at' : 'last_bill_at' => now(),
            ]);

            return TableServiceRequest::query()->create([
                'dining_session_id' => $session->id,
                'venue_id' => $session->venue_id,
                'venue_table_id' => $session->venue_table_id,
                'user_id' => $this->actor($request)?->id,
                'type' => $data['type'],
                'status' => 'open',
            ]);
        });

        if ($created) {
            Cache::put($ipKey, (int) Cache::get($ipKey, 0) + 1, now()->addMinutes(10));
            $this->notifyWaiters($session, $data['type'], $notifications);
        }

        $message = match (true) {
            $data['type'] === 'bill' && $created => 'Zahtjev za račun je poslat.',
            $data['type'] === 'bill' => 'Račun je već zatražen.',
            $created => 'Konobar je obaviješten.',
            default => 'Konobar je već obaviješten.',
        };

        return ApiResponse::success([
            'id' => $row->id,
            'type' => $row->type,
            'status' => $row->status,
        ], $message, $created ? 201 : 200);
    }

    public function sessions(Request $request): JsonResponse
    {
        $query = DiningSession::query()
            ->with(['orders.items', 'venue:id,name', 'requests' => fn ($requests) => $requests->where('status', 'open')])
            ->latest('opened_at');
        if (! $request->user()->isAdmin()) {
            $ids = $request->user()->businesses()->pluck('businesses.id');
            $query->whereHas('venue', fn ($venue) => $venue->whereIn('business_id', $ids));
        }

        return ApiResponse::success($query->limit(40)->get());
    }

    public function updateOrder(Request $request, Order $order, NotificationService $notifications, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $order->session->venue);
        $data = $request->validate(['status' => ['required', 'in:pending,confirmed,preparing,served,cancelled']]);
        $order->update(['status' => $data['status']]);
        $audit->record($request->user(), 'order.status', $order, $data);
        if ($order->user) {
            $notifications->notify($order->user, 'ORDER_STATUS_CHANGED', 'Narudžbina', 'Status je '.$data['status'].'.', ['order_id' => $order->id]);
        }

        return ApiResponse::success($order->refresh(), 'Narudžbina je ažurirana.');
    }

    public function closeSession(Request $request, DiningSession $session, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $session->venue);
        $session->requests()->where('status', 'open')->update(['status' => 'done', 'handled_at' => now()]);
        if ($session->reservation && $session->reservation->status === ReservationStatus::Seated) {
            app(ReservationService::class)->transition($request->user(), $session->reservation, ReservationStatus::Completed, 'Sesija zatvorena.');
        } else {
            $session->update(['status' => 'closed', 'closed_at' => now()]);
            $session->table?->update(['status' => TableStatus::Available]);
        }
        $audit->record($request->user(), 'session.closed', $session);

        return ApiResponse::success(null, 'Sesija je zatvorena.');
    }

    private function actor(Request $request): ?User
    {
        $user = $request->user('sanctum');
        if ($user && ! $user->is_active) {
            abort(403, 'Nalog je onemogućen.');
        }

        return $user;
    }

    private function resolveGuest(Request $request, DiningSession $session): ?DiningSessionGuest
    {
        if (! $request->filled('guest_token')) {
            return null;
        }

        return $this->findGuest($session, (string) $request->input('guest_token'));
    }

    private function findGuest(DiningSession $session, string $plain): ?DiningSessionGuest
    {
        return DiningSessionGuest::query()
            ->where('dining_session_id', $session->id)
            ->where('token_hash', hash('sha256', $plain))
            ->first();
    }

    private function notifyOrderStaff(Order $order, NotificationService $notifications): void
    {
        $order->loadMissing('items', 'venue.business');
        $stations = $order->items->pluck('station')->unique()->all();
        $assignments = VenueStaff::query()->where('venue_id', $order->venue_id)->get();
        $ids = [];
        foreach ($assignments as $row) {
            if ($row->hasRole('waiter') || array_intersect($row->roles ?? [], $stations)) {
                $ids[] = $row->user_id;
            }
        }
        if ($ids === [] && $order->venue?->business?->owner_id) {
            $ids[] = $order->venue->business->owner_id;
        }
        User::query()->whereIn('id', array_unique($ids))->get()->each(function (User $user) use ($notifications, $order) {
            $locale = $user->locale === 'cnr' ? 'cnr' : 'en';
            $notifications->notify($user, 'TABLE_ORDER', trans('messages.table_order_title', [], $locale), trans('messages.table_order_body', [
                'table' => $order->table_name_snapshot,
            ], $locale), [
                'order_id' => $order->id,
                'venue_id' => $order->venue_id,
                'table' => $order->table_name_snapshot,
            ]);
        });
    }

    private function notifyWaiters(DiningSession $session, string $type, NotificationService $notifications): void
    {
        $session->loadMissing('venue.business');
        $ids = VenueStaff::query()
            ->where('venue_id', $session->venue_id)
            ->get()
            ->filter(fn (VenueStaff $row) => $row->hasRole('waiter'))
            ->pluck('user_id');

        if ($ids->isEmpty() && $session->venue?->business?->owner_id) {
            $ids = collect([$session->venue->business->owner_id]);
        }

        $title = $type === 'bill' ? 'Račun' : 'Poziv konobara';
        $body = $type === 'bill'
            ? 'Sto '.$session->table_name_snapshot.' traži račun.'
            : 'Sto '.$session->table_name_snapshot.' zove konobara.';

        User::query()->whereIn('id', $ids->unique()->filter())->get()->each(function (User $user) use ($notifications, $type, $title, $body, $session) {
            $notifications->notify($user, $type === 'bill' ? 'TABLE_BILL' : 'TABLE_WAITER', $title, $body, [
                'session_id' => $session->id,
                'venue_id' => $session->venue_id,
                'table' => $session->table_name_snapshot,
            ]);
        });
    }
}
