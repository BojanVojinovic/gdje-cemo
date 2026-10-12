<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->unsignedInteger('price_cents');
            $table->char('currency', 3)->default('EUR');
            $table->unsignedSmallInteger('venue_limit');
            $table->unsignedSmallInteger('staff_limit');
            $table->json('features');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->string('status')->default('active')->index();
            $table->string('provider')->default('test');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });

        $now = now();
        $plans = [
            ['slug' => 'table', 'price_cents' => 2900, 'venue_limit' => 1, 'staff_limit' => 0, 'features' => json_encode(['listing', 'reservations']), 'sort_order' => 1],
            ['slug' => 'service', 'price_cents' => 6900, 'venue_limit' => 3, 'staff_limit' => 20, 'features' => json_encode(['listing', 'reservations', 'floor', 'delivery', 'staff', 'content', 'analytics']), 'sort_order' => 2],
            ['slug' => 'group', 'price_cents' => 14900, 'venue_limit' => 12, 'staff_limit' => 80, 'features' => json_encode(['listing', 'reservations', 'floor', 'delivery', 'staff', 'content', 'analytics']), 'sort_order' => 3],
        ];

        foreach ($plans as $plan) {
            DB::table('plans')->insert($plan + [
                'currency' => 'EUR',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach (['adriatic-hospitality' => 'group', 'kuca-hljeba' => 'service'] as $businessSlug => $planSlug) {
            $businessId = DB::table('businesses')->where('slug', $businessSlug)->whereNull('deleted_at')->value('id');
            $planId = DB::table('plans')->where('slug', $planSlug)->value('id');

            if (! $businessId || ! $planId || DB::table('subscriptions')->where('business_id', $businessId)->exists()) {
                continue;
            }

            DB::table('subscriptions')->insert([
                'business_id' => $businessId,
                'plan_id' => $planId,
                'status' => 'active',
                'provider' => 'test',
                'started_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
    }
};
