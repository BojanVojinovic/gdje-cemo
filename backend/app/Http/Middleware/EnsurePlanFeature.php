<?php

namespace App\Http\Middleware;

use App\Models\Business;
use App\Models\Venue;
use App\Services\SubscriptionService;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlanFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();

        if (! $user || $user->isAdmin()) {
            return $next($request);
        }

        $businessId = $this->businessId($request);

        if (! $businessId) {
            return $next($request);
        }

        $business = Business::query()->with('subscription.plan')->find($businessId);

        if ($business) {
            app(SubscriptionService::class)->assertFeature($user, $business, $feature);
        }

        return $next($request);
    }

    private function businessId(Request $request): ?int
    {
        foreach ($request->route()?->parameters() ?? [] as $parameter) {
            if ($parameter instanceof Venue) {
                return $parameter->business_id;
            }

            if (! $parameter instanceof Model) {
                continue;
            }

            $venueId = $parameter->getAttribute('venue_id');

            if ($venueId) {
                return Venue::query()->whereKey($venueId)->value('business_id');
            }

            $ownedBusinessId = $parameter->getAttribute('business_id');

            if ($ownedBusinessId) {
                return (int) $ownedBusinessId;
            }
        }

        return null;
    }
}
