<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReservationStatus;
use App\Enums\TableStatus;
use App\Http\Controllers\Controller;
use App\Models\DiningSession;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\TableQrCode;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Services\ReservationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $code = TableQrCode::query()->with('table.zone', 'table.venue')->where('token', $token)->where('is_active', true)->firstOrFail();
        $table = $code->table;
        if (! $table->is_orderable || ! $table->is_active) {
            throw ValidationException::withMessages(['table' => 'Ovaj sto trenutno ne prima narudžbine.']);
        }

        $session = DiningSession::query()->where('venue_table_id', $table->id)->where('status', 'active')->first();
        if (! $session) {
            $reservation = Reservation::query()
                ->where('user_id', $request->user()->id)
                ->where('status', ReservationStatus::Seated)
                ->whereJsonContains('table_ids', $table->id)
                ->first();
            $session = DiningSession::query()->create([
                'venue_id' => $table->venue_id,
                'venue_table_id' => $table->id,
                'reservation_id' => $reservation?->id,
                'user_id' => $request->user()->id,
                'party_size' => $reservation?->party_size ?? 1,
                'status' => 'active',
                'table_name_snapshot' => $table->name,
                'zone_name_snapshot' => $table->zone?->name,
                'opened_at' => now(),
            ]);
            $table->update(['status' => TableStatus::Occupied]);
        }

        return ApiResponse::success(['session_id' => $session->id, 'table_name' => $session->table_name_snapshot], 'Sesija je otvorena.');
    }

    public function order(Request $request, DiningSession $session, NotificationService $notifications): JsonResponse
    {
        if ($session->status !== 'active') {
            throw ValidationException::withMessages(['session' => 'Sesija je zatvorena.']);
        }
        $staff = $request->user()->managesVenue($session->venue);
        if (! $staff && $session->user_id && $session->user_id !== $request->user()->id && $session->reservation?->user_id !== $request->user()->id) {
            abort(403, 'Ova sesija pripada drugom stolu.');
        }
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:20'],
        ]);

        $order = DB::transaction(function () use ($request, $session, $data) {
            $order = Order::query()->create([
                'dining_session_id' => $session->id,
                'venue_id' => $session->venue_id,
                'user_id' => $request->user()->id,
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'table_name_snapshot' => $session->table_name_snapshot,
            ]);
            foreach ($data['items'] as $row) {
                $item = MenuItem::query()->whereHas('category.menu', fn ($menu) => $menu->where('venue_id', $session->venue_id))->find($row['menu_item_id']);
                if (! $item || ! $item->is_available) {
                    throw ValidationException::withMessages(['items' => 'Stavka nije dostupna na meniju ovog mjesta.']);
                }
                $order->items()->create([
                    'menu_item_id' => $item->id,
                    'name_snapshot' => $item->name,
                    'price_snapshot' => $item->price,
                    'quantity' => $row['quantity'],
                ]);
            }
            $session->table?->update(['status' => TableStatus::Ordering]);

            return $order->load('items');
        });

        return ApiResponse::success($order, 'Narudžbina je poslata.', 201);
    }

    public function sessions(Request $request): JsonResponse
    {
        $query = DiningSession::query()->with(['orders.items', 'venue:id,name'])->latest('opened_at');
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
        if ($session->reservation && $session->reservation->status === ReservationStatus::Seated) {
            app(ReservationService::class)->transition($request->user(), $session->reservation, ReservationStatus::Completed, 'Sesija zatvorena.');
        } else {
            $session->update(['status' => 'closed', 'closed_at' => now()]);
            $session->table?->update(['status' => TableStatus::Available]);
        }
        $audit->record($request->user(), 'session.closed', $session);

        return ApiResponse::success(null, 'Sesija je zatvorena.');
    }
}
