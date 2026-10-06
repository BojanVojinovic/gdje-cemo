<?php

namespace App\Services;

use App\Models\DeliveryOrder;
use App\Models\EventRegistration;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueContent;
use App\Models\VenueMetricDay;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    private const TZ = 'Europe/Podgorica';

    public function business(Collection $venues, int $days, ?int $venueId = null): array
    {
        $days = $this->days($days);
        if ($venueId) {
            $venues = $venues->where('id', $venueId)->values();
        }
        [$start, $end, $previousStart] = $this->window($days);
        $ids = $venues->pluck('id')->all();

        $period = $this->activity($ids, $start, $end);
        $previous = $this->activity($ids, $previousStart, $start);
        $views = $this->views($ids, $start, $end);
        $previousViews = $this->views($ids, $previousStart, $start);

        return [
            'range_days' => $days,
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'lifetime' => [
                'profile_views' => (int) $venues->sum('profile_views'),
                'menu_views' => (int) $venues->sum('menu_views'),
                'favorites' => (int) DB::table('favorites')->whereIn('venue_id', $ids ?: [0])->count(),
                'reviews' => (int) $venues->sum('reviews_count'),
                'rating_avg' => $this->rating($venues),
            ],
            'period' => array_merge($period['totals'], $views),
            'previous' => array_merge($previous['totals'], $previousViews),
            'series' => $this->series($start, $end, $period['daily'], $this->viewSeries($ids, $start, $end)),
            'reservations_by_status' => $period['reservations_by_status'],
            'orders_by_status' => $period['orders_by_status'],
            'deliveries_by_status' => $period['deliveries_by_status'],
            'top_items' => $this->topItems($ids, $start, $end),
            'busiest_weekdays' => $period['weekdays'],
            'venues' => $venues->map(fn (Venue $venue) => [
                'id' => $venue->id,
                'name' => $venue->name,
                'city' => $venue->city,
                'slug' => $venue->slug,
                'status' => $venue->status instanceof \BackedEnum ? $venue->status->value : $venue->status,
                'profile_views' => (int) $venue->profile_views,
                'menu_views' => (int) $venue->menu_views,
                'rating_avg' => round((float) $venue->rating_avg, 2),
                'reviews_count' => (int) $venue->reviews_count,
            ])->values(),
        ];
    }

    public function admin(int $days): array
    {
        $days = $this->days($days);
        [$start, $end, $previousStart] = $this->window($days);
        $venues = Venue::query()->get(['id', 'name', 'city', 'profile_views', 'menu_views', 'rating_avg', 'reviews_count', 'status']);
        $business = $this->business($venues, $days);

        $signups = User::query()->whereBetween('created_at', [$start, $end])->get(['id', 'created_at', 'role_id']);
        $previousSignups = User::query()->whereBetween('created_at', [$previousStart, $start])->count();
        $roles = DB::table('roles')->pluck('slug', 'id');
        $byRole = [];
        foreach ($signups as $user) {
            $slug = $roles[$user->role_id] ?? 'customer';
            $byRole[$slug] = ($byRole[$slug] ?? 0) + 1;
        }

        $daily = [];
        foreach ($signups as $user) {
            $key = $user->created_at?->timezone(self::TZ)->toDateString();
            if ($key) {
                $daily[$key] = ($daily[$key] ?? 0) + 1;
            }
        }

        return [
            'range_days' => $days,
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'platform' => [
                'users' => User::query()->count(),
                'new_users' => $signups->count(),
                'previous_new_users' => $previousSignups,
                'businesses' => DB::table('businesses')->count(),
                'pending_businesses' => DB::table('businesses')->where('status', 'pending')->count(),
                'venues' => $venues->count(),
                'published_venues' => $venues->filter(fn (Venue $venue) => ($venue->status instanceof \BackedEnum ? $venue->status->value : $venue->status) === 'published')->count(),
                'pending_reports' => DB::table('reports')->where('status', 'pending')->count(),
            ],
            'period' => $business['period'],
            'previous' => $business['previous'],
            'series' => collect($business['series'])->map(function (array $row) use ($daily) {
                $row['signups'] = $daily[$row['date']] ?? 0;

                return $row;
            })->all(),
            'signups_by_role' => $byRole,
            'reservations_by_status' => $business['reservations_by_status'],
            'orders_by_status' => $business['orders_by_status'],
            'deliveries_by_status' => $business['deliveries_by_status'],
            'top_venues' => $venues->sortByDesc('profile_views')->take(8)->map(fn (Venue $venue) => [
                'id' => $venue->id,
                'name' => $venue->name,
                'city' => $venue->city,
                'profile_views' => (int) $venue->profile_views,
                'menu_views' => (int) $venue->menu_views,
                'rating_avg' => round((float) $venue->rating_avg, 2),
                'reviews_count' => (int) $venue->reviews_count,
            ])->values(),
            'top_items' => $business['top_items'],
            'busiest_weekdays' => $business['busiest_weekdays'],
        ];
    }

    private function days(int $days): int
    {
        return in_array($days, [7, 30, 90], true) ? $days : 30;
    }

    /** @return array{0: Carbon, 1: Carbon, 2: Carbon} */
    private function window(int $days): array
    {
        $end = now(self::TZ)->endOfDay();
        $start = now(self::TZ)->subDays($days - 1)->startOfDay();
        $previousStart = $start->copy()->subDays($days);

        return [$start, $end, $previousStart];
    }

    private function activity(array $ids, Carbon $start, Carbon $end): array
    {
        $empty = [
            'totals' => [
                'reservations' => 0,
                'covers' => 0,
                'orders' => 0,
                'deliveries' => 0,
                'delivery_revenue' => 0,
                'reviews' => 0,
                'favorites' => 0,
                'event_signups' => 0,
            ],
            'daily' => [],
            'reservations_by_status' => [],
            'orders_by_status' => [],
            'deliveries_by_status' => [],
            'weekdays' => array_fill(0, 7, ['reservations' => 0, 'orders' => 0]),
        ];
        if ($ids === []) {
            return $empty;
        }

        $reservations = Reservation::query()->whereIn('venue_id', $ids)->whereBetween('created_at', [$start, $end])->get(['status', 'party_size', 'created_at', 'start_at']);
        $orders = Order::query()->whereIn('venue_id', $ids)->whereBetween('created_at', [$start, $end])->get(['status', 'created_at']);
        $deliveries = DeliveryOrder::query()->whereIn('venue_id', $ids)->whereBetween('created_at', [$start, $end])->get(['status', 'total', 'created_at']);
        $reviews = Review::query()->whereIn('venue_id', $ids)->whereBetween('created_at', [$start, $end])->count();
        $favorites = DB::table('favorites')->whereIn('venue_id', $ids)->whereBetween('created_at', [$start, $end])->count();
        $contentIds = VenueContent::query()->whereIn('venue_id', $ids)->pluck('id');
        $signups = $contentIds->isEmpty()
            ? 0
            : EventRegistration::query()->whereIn('venue_content_id', $contentIds)->whereBetween('created_at', [$start, $end])->count();

        $daily = [];
        $reservationsBy = [];
        $ordersBy = [];
        $deliveriesBy = [];
        $weekdays = array_fill(0, 7, ['reservations' => 0, 'orders' => 0]);
        $revenue = 0;

        foreach ($reservations as $row) {
            $status = $this->status($row->status);
            $reservationsBy[$status] = ($reservationsBy[$status] ?? 0) + 1;
            $day = $row->created_at?->timezone(self::TZ)->toDateString();
            if ($day) {
                $daily[$day]['reservations'] = ($daily[$day]['reservations'] ?? 0) + 1;
            }
            $weekday = $row->start_at?->timezone(self::TZ)->dayOfWeek;
            if ($weekday !== null) {
                $weekdays[$weekday]['reservations']++;
            }
        }
        foreach ($orders as $row) {
            $status = $this->status($row->status);
            $ordersBy[$status] = ($ordersBy[$status] ?? 0) + 1;
            $day = $row->created_at?->timezone(self::TZ)->toDateString();
            if ($day) {
                $daily[$day]['orders'] = ($daily[$day]['orders'] ?? 0) + 1;
            }
            $weekday = $row->created_at?->timezone(self::TZ)->dayOfWeek;
            if ($weekday !== null) {
                $weekdays[$weekday]['orders']++;
            }
        }
        foreach ($deliveries as $row) {
            $status = $this->status($row->status);
            $deliveriesBy[$status] = ($deliveriesBy[$status] ?? 0) + 1;
            if ($status !== 'cancelled') {
                $revenue += (float) $row->total;
            }
            $day = $row->created_at?->timezone(self::TZ)->toDateString();
            if ($day) {
                $daily[$day]['deliveries'] = ($daily[$day]['deliveries'] ?? 0) + 1;
            }
        }

        return [
            'totals' => [
                'reservations' => $reservations->count(),
                'covers' => (int) $reservations->sum('party_size'),
                'orders' => $orders->count(),
                'deliveries' => $deliveries->count(),
                'delivery_revenue' => round($revenue, 2),
                'reviews' => $reviews,
                'favorites' => $favorites,
                'event_signups' => $signups,
            ],
            'daily' => $daily,
            'reservations_by_status' => $reservationsBy,
            'orders_by_status' => $ordersBy,
            'deliveries_by_status' => $deliveriesBy,
            'weekdays' => $weekdays,
        ];
    }

    private function views(array $ids, Carbon $start, Carbon $end): array
    {
        if ($ids === []) {
            return ['profile_views' => 0, 'menu_views' => 0];
        }
        $rows = VenueMetricDay::query()
            ->whereIn('venue_id', $ids)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->get(['profile_views', 'menu_views']);

        return [
            'profile_views' => (int) $rows->sum('profile_views'),
            'menu_views' => (int) $rows->sum('menu_views'),
        ];
    }

    private function viewSeries(array $ids, Carbon $start, Carbon $end): array
    {
        if ($ids === []) {
            return [];
        }
        $rows = VenueMetricDay::query()
            ->whereIn('venue_id', $ids)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->get(['date', 'profile_views', 'menu_views']);
        $series = [];
        foreach ($rows as $row) {
            $key = $row->date?->toDateString();
            if (! $key) {
                continue;
            }
            $series[$key]['profile_views'] = ($series[$key]['profile_views'] ?? 0) + (int) $row->profile_views;
            $series[$key]['menu_views'] = ($series[$key]['menu_views'] ?? 0) + (int) $row->menu_views;
        }

        return $series;
    }

    private function series(Carbon $start, Carbon $end, array $daily, array $views): array
    {
        $rows = [];
        $cursor = $start->copy()->startOfDay();
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            $rows[] = [
                'date' => $key,
                'reservations' => $daily[$key]['reservations'] ?? 0,
                'orders' => $daily[$key]['orders'] ?? 0,
                'deliveries' => $daily[$key]['deliveries'] ?? 0,
                'profile_views' => $views[$key]['profile_views'] ?? 0,
                'menu_views' => $views[$key]['menu_views'] ?? 0,
            ];
            $cursor->addDay();
        }

        return $rows;
    }

    private function topItems(array $ids, Carbon $start, Carbon $end): array
    {
        if ($ids === []) {
            return [];
        }
        $table = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.venue_id', $ids)
            ->where('orders.status', '!=', 'cancelled')
            ->whereBetween('orders.created_at', [$start, $end])
            ->selectRaw('order_items.name_snapshot as name, sum(order_items.quantity) as quantity, sum(order_items.price_snapshot * order_items.quantity) as revenue')
            ->groupBy('order_items.name_snapshot')
            ->get();
        $delivery = DB::table('delivery_order_items')
            ->join('delivery_orders', 'delivery_orders.id', '=', 'delivery_order_items.delivery_order_id')
            ->whereIn('delivery_orders.venue_id', $ids)
            ->where('delivery_orders.status', '!=', 'cancelled')
            ->whereBetween('delivery_orders.created_at', [$start, $end])
            ->selectRaw('delivery_order_items.name_snapshot as name, sum(delivery_order_items.quantity) as quantity, sum(delivery_order_items.price_snapshot * delivery_order_items.quantity) as revenue')
            ->groupBy('delivery_order_items.name_snapshot')
            ->get();

        $merged = [];
        foreach ($table->concat($delivery) as $row) {
            $name = (string) $row->name;
            $merged[$name]['name'] = $name;
            $merged[$name]['quantity'] = ($merged[$name]['quantity'] ?? 0) + (int) $row->quantity;
            $merged[$name]['revenue'] = round(($merged[$name]['revenue'] ?? 0) + (float) $row->revenue, 2);
        }

        return collect($merged)->sortByDesc('quantity')->take(8)->values()->all();
    }

    private function rating(Collection $venues): float
    {
        $rated = $venues->where('reviews_count', '>', 0);
        if ($rated->isEmpty()) {
            return 0;
        }

        return round((float) $rated->avg('rating_avg'), 2);
    }

    private function status(mixed $status): string
    {
        return $status instanceof \BackedEnum ? (string) $status->value : (string) $status;
    }
}
