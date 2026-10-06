<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('locale', 8)->default('en')->after('is_active');
        });

        Schema::table('venues', function (Blueprint $table) {
            $table->boolean('offers_delivery')->default(false)->after('is_featured');
            $table->unsignedSmallInteger('delivery_eta_minutes')->nullable()->after('offers_delivery');
        });

        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->boolean('delivery_status')->default(true)->after('order_status_changed');
        });

        Schema::create('email_verification_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['user_id', 'expires_at']);
        });

        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('received');
            $table->string('address', 255);
            $table->string('city', 120);
            $table->string('phone', 40);
            $table->text('notes')->nullable();
            $table->unsignedSmallInteger('eta_minutes');
            $table->timestamp('eta_at')->nullable();
            $table->decimal('total', 10, 2)->default(0);
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
            $table->index(['venue_id', 'status']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('delivery_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name_snapshot');
            $table->decimal('price_snapshot', 10, 2);
            $table->unsignedSmallInteger('quantity');
            $table->string('station', 20)->default('kitchen');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_order_items');
        Schema::dropIfExists('delivery_orders');
        Schema::dropIfExists('email_verification_codes');
        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->dropColumn('delivery_status');
        });
        Schema::table('venues', function (Blueprint $table) {
            $table->dropColumn(['offers_delivery', 'delivery_eta_minutes']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('locale');
        });
    }
};
