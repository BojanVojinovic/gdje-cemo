<?php

namespace App\Services;

use App\Enums\BusinessStatus;
use App\Models\Business;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueStaff;
use App\Support\ContentLocales;

class SubscriptionService
{
    /** @var array<string, array{name: string, summary: string, lines: list<string>}> */
    private const COPY = [
        'table' => [
            'name' => 'plan_table_name',
            'summary' => 'plan_table_summary',
            'lines' => ['plan_table_1', 'plan_table_2', 'plan_table_3'],
        ],
        'service' => [
            'name' => 'plan_service_name',
            'summary' => 'plan_service_summary',
            'lines' => ['plan_service_1', 'plan_service_2', 'plan_service_3', 'plan_service_4', 'plan_service_5', 'plan_service_6'],
        ],
        'group' => [
            'name' => 'plan_group_name',
            'summary' => 'plan_group_summary',
            'lines' => ['plan_group_1', 'plan_group_2', 'plan_group_3'],
        ],
    ];

    public function overview(User $user): array
    {
        $this->useRequestLocale();

        $plans = Plan::query()->where('is_active', true)->orderBy('sort_order')->get();
        $businesses = $user->businesses()
            ->where('businesses.status', BusinessStatus::Approved->value)
            ->with('subscription.plan')
            ->get();

        return [
            'plans' => $plans->map(fn (Plan $plan) => $this->presentPlan($plan))->values(),
            'businesses' => $businesses->map(fn (Business $business) => [
                'id' => $business->id,
                'name' => $business->name,
                'venue_count' => $business->venues()->count(),
                'staff_count' => VenueStaff::query()->where('business_id', $business->id)->count(),
                'subscription' => $this->presentSubscription($business->subscription),
            ])->values(),
        ];
    }

    public function change(User $user, string $slug, ?int $businessId): Subscription
    {
        $this->useRequestLocale();
        $business = $this->resolve($user, $businessId);
        $plan = Plan::query()->where('slug', $slug)->where('is_active', true)->first();

        if (! $plan) {
            abort(422, __('messages.plan_unknown'));
        }

        return $this->grant($business, $plan);
    }

    public function cancel(User $user, ?int $businessId): Subscription
    {
        $this->useRequestLocale();
        $business = $this->resolve($user, $businessId);
        $subscription = $business->subscription()->first();

        if (! $subscription) {
            abort(422, __('messages.plan_missing'));
        }

        if ($subscription->isActive()) {
            $subscription->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);
        }

        return $subscription->fresh('plan');
    }

    public function grant(Business $business, Plan|string $plan): Subscription
    {
        $plan = $plan instanceof Plan
            ? $plan
            : Plan::query()->where('slug', $plan)->where('is_active', true)->firstOrFail();

        return Subscription::query()->updateOrCreate(
            ['business_id' => $business->id],
            [
                'plan_id' => $plan->id,
                'status' => 'active',
                'provider' => 'test',
                'started_at' => now(),
                'cancelled_at' => null,
            ],
        );
    }

    public function assertFeature(User $actor, Business $business, string $feature): void
    {
        if ($actor->isAdmin()) {
            return;
        }

        $subscription = $this->gate($business);

        if ($subscription === null) {
            return;
        }

        if (! in_array($feature, $subscription->plan->features ?? [], true)) {
            abort(403, __('messages.plan_feature'));
        }
    }

    public function assertVenueSlot(User $actor, Business $business): void
    {
        if ($actor->isAdmin()) {
            return;
        }

        $subscription = $this->gate($business);

        if ($subscription === null) {
            return;
        }

        if ($business->venues()->count() >= $subscription->plan->venue_limit) {
            abort(403, __('messages.plan_venue_limit', ['limit' => $subscription->plan->venue_limit]));
        }
    }

    public function assertStaffSlot(User $actor, Business $business): void
    {
        if ($actor->isAdmin()) {
            return;
        }

        $subscription = $this->gate($business);

        if ($subscription === null) {
            return;
        }

        if (! in_array('staff', $subscription->plan->features ?? [], true)) {
            abort(403, __('messages.plan_feature'));
        }

        $count = VenueStaff::query()->where('business_id', $business->id)->count();

        if ($count >= $subscription->plan->staff_limit) {
            abort(403, __('messages.plan_staff_limit', ['limit' => $subscription->plan->staff_limit]));
        }
    }

    public function assertCanEnableDelivery(User $actor, Venue $venue, array $data): void
    {
        $turningOn = array_key_exists('offers_delivery', $data)
            && filter_var($data['offers_delivery'], FILTER_VALIDATE_BOOLEAN)
            && ! $venue->offers_delivery;

        if (! $turningOn) {
            return;
        }

        $venue->loadMissing('business');
        $this->assertFeature($actor, $venue->business, 'delivery');
    }

    public function presentSubscription(?Subscription $subscription): ?array
    {
        if (! $subscription) {
            return null;
        }

        $subscription->loadMissing('plan');

        return [
            'status' => $subscription->status,
            'provider' => $subscription->provider,
            'plan' => $subscription->plan?->slug,
            'started_at' => $subscription->started_at?->toIso8601String(),
            'cancelled_at' => $subscription->cancelled_at?->toIso8601String(),
        ];
    }

    public function presentPlan(Plan $plan): array
    {
        $copy = self::COPY[$plan->slug] ?? null;

        return [
            'slug' => $plan->slug,
            'name' => $copy ? __('messages.'.$copy['name']) : $plan->slug,
            'summary' => $copy ? __('messages.'.$copy['summary']) : '',
            'lines' => $copy ? array_map(fn (string $key) => __('messages.'.$key), $copy['lines']) : [],
            'price_cents' => $plan->price_cents,
            'currency' => $plan->currency,
            'venue_limit' => $plan->venue_limit,
            'staff_limit' => $plan->staff_limit,
            'features' => $plan->features ?? [],
        ];
    }

    private function resolve(User $user, ?int $businessId): Business
    {
        $query = $user->businesses()->where('businesses.status', BusinessStatus::Approved->value);
        $business = $businessId
            ? (clone $query)->where('businesses.id', $businessId)->first()
            : ($query->count() === 1 ? $query->first() : null);

        if (! $business) {
            abort(422, __('messages.plan_business'));
        }

        return $business;
    }

    /**
     * No subscription row means the business is not on a plan yet, so existing
     * tools keep working. A cancelled row, or an active plan without the tool, stops it.
     */
    private function gate(Business $business): ?Subscription
    {
        $this->useRequestLocale();
        $subscription = $business->relationLoaded('subscription')
            ? $business->subscription
            : $business->subscription()->with('plan')->first();

        if ($subscription === null) {
            return null;
        }

        if (! $subscription->isActive()) {
            abort(403, __('messages.plan_inactive'));
        }

        $subscription->loadMissing('plan');

        return $subscription;
    }

    private function useRequestLocale(): void
    {
        app()->setLocale(ContentLocales::fromRequest());
    }
}
