<?php

namespace App\Http\Controllers\Api\Business;

use App\Http\Controllers\Controller;
use App\Services\SubscriptionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function index(Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        return ApiResponse::success($subscriptions->overview($request->user()));
    }

    public function store(Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate([
            'plan' => ['required', 'string', 'max:40'],
            'business_id' => ['nullable', 'integer'],
        ]);

        $subscription = $subscriptions->change($request->user(), $data['plan'], $data['business_id'] ?? null);

        return ApiResponse::success(
            $subscriptions->presentSubscription($subscription->fresh('plan')),
            __('messages.plan_switched'),
        );
    }

    public function cancel(Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate([
            'business_id' => ['nullable', 'integer'],
        ]);

        $subscription = $subscriptions->cancel($request->user(), $data['business_id'] ?? null);

        return ApiResponse::success(
            $subscriptions->presentSubscription($subscription),
            __('messages.plan_cancelled_msg'),
        );
    }
}
