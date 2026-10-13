<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table) {
            $table->boolean('offers_loungers')->default(false)->after('delivery_eta_minutes');
        });

        Schema::create('lounger_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('canvas_width')->default(960);
            $table->unsignedInteger('canvas_height')->default(640);
            $table->timestamps();
        });

        Schema::create('lounger_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lounger_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->default('#1f6f8b');
            $table->unsignedInteger('price_cents');
            $table->unsignedSmallInteger('water_meters');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('loungers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lounger_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('lounger_zones')->nullOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('seats')->default(1);
            $table->unsignedInteger('price_cents')->nullable();
            $table->string('shape', 20)->default('single');
            $table->decimal('position_x', 8, 2)->default(40);
            $table->decimal('position_y', 8, 2)->default(40);
            $table->decimal('width', 8, 2)->default(72);
            $table->decimal('height', 8, 2)->default(120);
            $table->decimal('rotation', 6, 2)->default(0);
            $table->string('status', 20)->default('available');
            $table->boolean('is_orderable')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('lounger_qr_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lounger_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('lounger_rentals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lounger_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guest_name');
            $table->string('guest_phone')->nullable();
            $table->unsignedTinyInteger('seats');
            $table->date('rental_date');
            $table->unsignedInteger('price_cents');
            $table->string('status', 20)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['venue_id', 'rental_date', 'status']);
        });

        Schema::table('dining_sessions', function (Blueprint $table) {
            $table->foreignId('lounger_id')->nullable()->after('venue_table_id')->constrained('loungers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('dining_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lounger_id');
        });

        Schema::dropIfExists('lounger_rentals');
        Schema::dropIfExists('lounger_qr_codes');
        Schema::dropIfExists('loungers');
        Schema::dropIfExists('lounger_zones');
        Schema::dropIfExists('lounger_plans');

        Schema::table('venues', function (Blueprint $table) {
            $table->dropColumn('offers_loungers');
        });
    }
};
