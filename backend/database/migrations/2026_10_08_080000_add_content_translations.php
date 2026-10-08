<?php

use App\Support\ContentLocales;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['venues', 'menu_categories', 'menu_items', 'venue_contents', 'categories', 'amenities'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->json('translations')->nullable();
            });
        }

        foreach (ContentLocales::catalog() as $table => $rows) {
            foreach ($rows as $slug => $bag) {
                DB::table($table)->where('slug', $slug)->update([
                    'translations' => json_encode($bag, JSON_UNESCAPED_UNICODE),
                ]);
            }
        }
    }

    public function down(): void
    {
        foreach (['venues', 'menu_categories', 'menu_items', 'venue_contents', 'categories', 'amenities'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('translations');
            });
        }
    }
};
