<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->where('key', 'site_name')->where('value', 'Gdje ćemo')->update(['value' => 'Shall We']);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'site_name')->where('value', 'Shall We')->update(['value' => 'Gdje ćemo']);
    }
};
