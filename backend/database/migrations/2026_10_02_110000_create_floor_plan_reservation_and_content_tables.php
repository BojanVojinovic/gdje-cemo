<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table) {
            $table->boolean('publishing_suspended')->default(false)->after('menu_views');
        });

        Schema::create('table_features', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('venue_floor_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->string('name')->default('Glavni tlocrt');
            $table->string('background_path')->nullable();
            $table->unsignedInteger('canvas_width')->default(960);
            $table->unsignedInteger('canvas_height')->default(640);
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('venue_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('floor_plan_id')->constrained('venue_floor_plans')->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->default('#0e4c49');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('venue_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('floor_plan_id')->constrained('venue_floor_plans')->cascadeOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('venue_zones')->nullOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('capacity_min')->default(1);
            $table->unsignedTinyInteger('capacity_max')->default(2);
            $table->string('shape', 20)->default('square');
            $table->decimal('position_x', 8, 2)->default(40);
            $table->decimal('position_y', 8, 2)->default(40);
            $table->decimal('width', 8, 2)->default(88);
            $table->decimal('height', 8, 2)->default(88);
            $table->decimal('rotation', 6, 2)->default(0);
            $table->string('status', 20)->default('available');
            $table->boolean('is_reservable')->default(true);
            $table->boolean('is_orderable')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['venue_id', 'status']);
        });

        Schema::create('table_feature_venue_table', function (Blueprint $table) {
            $table->foreignId('venue_table_id')->constrained()->cascadeOnDelete();
            $table->foreignId('table_feature_id')->constrained()->cascadeOnDelete();
            $table->primary(['venue_table_id', 'table_feature_id']);
        });

        Schema::create('table_combinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('capacity_min')->default(2);
            $table->unsignedTinyInteger('capacity_max')->default(4);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('table_combination_table', function (Blueprint $table) {
            $table->foreignId('table_combination_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_table_id')->constrained()->cascadeOnDelete();
            $table->primary(['table_combination_id', 'venue_table_id']);
        });

        Schema::create('table_qr_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_table_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('venue_reservation_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('enabled')->default(false);
            $table->unsignedInteger('min_advance_minutes')->default(30);
            $table->unsignedInteger('max_advance_days')->default(30);
            $table->unsignedInteger('duration_minutes')->default(90);
            $table->unsignedInteger('buffer_minutes')->default(15);
            $table->unsignedTinyInteger('min_party_size')->default(1);
            $table->unsignedTinyInteger('max_party_size')->default(12);
            $table->unsignedInteger('cancellation_deadline_minutes')->default(120);
            $table->boolean('auto_confirm')->default(true);
            $table->boolean('allow_table_selection')->default(true);
            $table->boolean('auto_assign')->default(true);
            $table->boolean('allow_larger_tables')->default(true);
            $table->boolean('waitlist_enabled')->default(true);
            $table->json('reminder_hours')->nullable();
            $table->timestamps();
        });

        Schema::create('venue_closures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('reason');
            $table->boolean('blocks_reservations')->default(true);
            $table->timestamps();
            $table->index(['venue_id', 'starts_at', 'ends_at']);
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_table_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('table_combination_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->json('table_ids');
            $table->unsignedTinyInteger('party_size');
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->string('status', 20)->default('pending');
            $table->string('source', 20)->default('online');
            $table->text('notes')->nullable();
            $table->string('guest_name')->nullable();
            $table->string('guest_phone', 40)->nullable();
            $table->string('table_name_snapshot');
            $table->string('zone_name_snapshot')->nullable();
            $table->string('capacity_snapshot', 20)->nullable();
            $table->dateTime('seated_at')->nullable();
            $table->timestamps();
            $table->index(['venue_id', 'start_at', 'end_at']);
            $table->index(['venue_table_id', 'start_at']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('reservation_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->string('note')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('party_size');
            $table->dateTime('preferred_start');
            $table->unsignedInteger('flexibility_minutes')->default(60);
            $table->string('status', 20)->default('waiting');
            $table->dateTime('notified_at')->nullable();
            $table->timestamps();
            $table->index(['venue_id', 'status', 'preferred_start']);
        });

        Schema::create('dining_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_table_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('party_size')->default(1);
            $table->string('status', 20)->default('active');
            $table->string('table_name_snapshot');
            $table->string('zone_name_snapshot')->nullable();
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->timestamps();
            $table->index(['venue_id', 'status']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dining_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->text('notes')->nullable();
            $table->string('table_name_snapshot');
            $table->timestamps();
            $table->index(['venue_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name_snapshot');
            $table->decimal('price_snapshot', 8, 2);
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->timestamps();
        });

        Schema::create('venue_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 30);
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('body')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('video_url')->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedTinyInteger('priority')->default(0);
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('published_at')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('event_start_at')->nullable();
            $table->dateTime('event_end_at')->nullable();
            $table->string('event_category')->nullable();
            $table->decimal('price', 8, 2)->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->string('registration_mode', 30)->default('none');
            $table->string('organizer')->nullable();
            $table->boolean('blocks_reservations')->default(false);
            $table->dateTime('valid_from')->nullable();
            $table->dateTime('valid_until')->nullable();
            $table->time('daily_start')->nullable();
            $table->time('daily_end')->nullable();
            $table->json('days_of_week')->nullable();
            $table->text('terms')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['venue_id', 'type', 'status']);
            $table->index(['status', 'scheduled_at']);
            $table->index(['event_start_at', 'status']);
        });

        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_content_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('registered');
            $table->timestamps();
            $table->unique(['venue_content_id', 'user_id']);
        });

        Schema::create('venue_followers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['venue_id', 'user_id']);
        });

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('new_event')->default(true);
            $table->boolean('event_updated')->default(true);
            $table->boolean('event_cancelled')->default(true);
            $table->boolean('new_post')->default(true);
            $table->boolean('new_promotion')->default(true);
            $table->boolean('venue_announcement')->default(true);
            $table->boolean('reservation_confirmed')->default(true);
            $table->boolean('reservation_cancelled')->default(true);
            $table->boolean('reservation_reminder')->default(true);
            $table->boolean('order_status_changed')->default(true);
            $table->timestamps();
        });

        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('title');
            $table->text('body');
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 80);
            $table->string('subject_type', 40)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('user_notifications');
        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('venue_followers');
        Schema::dropIfExists('event_registrations');
        Schema::dropIfExists('venue_contents');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('dining_sessions');
        Schema::dropIfExists('waitlist_entries');
        Schema::dropIfExists('reservation_status_histories');
        Schema::dropIfExists('reservations');
        Schema::dropIfExists('venue_closures');
        Schema::dropIfExists('venue_reservation_settings');
        Schema::dropIfExists('table_qr_codes');
        Schema::dropIfExists('table_combination_table');
        Schema::dropIfExists('table_combinations');
        Schema::dropIfExists('table_feature_venue_table');
        Schema::dropIfExists('venue_tables');
        Schema::dropIfExists('venue_zones');
        Schema::dropIfExists('venue_floor_plans');
        Schema::dropIfExists('table_features');
        Schema::table('venues', function (Blueprint $table) {
            $table->dropColumn('publishing_suspended');
        });
    }
};
