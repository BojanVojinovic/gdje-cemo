<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venue_metric_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('profile_views')->default(0);
            $table->unsignedInteger('menu_views')->default(0);
            $table->timestamps();
            $table->unique(['venue_id', 'date']);
        });

        Schema::create('staff_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('covered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('role', 20)->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('notes', 500)->nullable();
            $table->string('status', 20)->default('scheduled');
            $table->timestamps();
            $table->index(['venue_id', 'starts_at']);
            $table->index(['user_id', 'starts_at']);
        });

        Schema::create('shift_swaps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->string('note', 500)->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->index(['to_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_swaps');
        Schema::dropIfExists('staff_shifts');
        Schema::dropIfExists('venue_metric_days');
    }
};
