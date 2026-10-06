<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->string('station', 16)->default('kitchen')->after('name');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('station', 16)->default('kitchen')->after('quantity');
        });

        Schema::create('venue_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->json('roles');
            $table->timestamps();

            $table->unique(['user_id', 'venue_id']);
        });

        Schema::create('dining_session_guests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dining_session_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('last_waiter_at')->nullable();
            $table->timestamp('last_bill_at')->nullable();
            $table->timestamps();
        });

        Schema::create('table_service_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dining_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_table_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 16);
            $table->string('status', 16)->default('open');
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();

            $table->index(['venue_id', 'status']);
        });

        DB::table('menu_categories')
            ->where(function ($query) {
                foreach (['pić', 'Pić', 'pice', 'koktel', 'Koktel', 'vino', 'pivo', 'kafa', 'Kafa', 'kava', 'sok', 'žest', 'napit'] as $word) {
                    $query->orWhere('name', 'like', '%'.$word.'%');
                }
            })
            ->update(['station' => 'bar']);
    }

    public function down(): void
    {
        Schema::dropIfExists('table_service_requests');
        Schema::dropIfExists('dining_session_guests');
        Schema::dropIfExists('venue_staff');
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('station');
        });
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->dropColumn('station');
        });
    }
};
