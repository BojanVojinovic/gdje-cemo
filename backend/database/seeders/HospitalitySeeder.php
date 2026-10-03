<?php

namespace Database\Seeders;

use App\Enums\ContentStatus;
use App\Enums\ContentType;
use App\Enums\TableShape;
use App\Models\TableCombination;
use App\Models\TableFeature;
use App\Models\TableQrCode;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueContent;
use App\Models\VenueFloorPlan;
use App\Models\VenueReservationSetting;
use App\Models\VenueTable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class HospitalitySeeder extends Seeder
{
    public function run(): void
    {
        $features = [
            'indoor' => 'Unutra',
            'outdoor' => 'Napolju',
            'terrace' => 'Terasa',
            'smoking' => 'Pušenje',
            'non-smoking' => 'Nepušačka zona',
            'window' => 'Prozor',
            'bar' => 'Šank',
            'booth' => 'Separe',
            'accessible' => 'Pristupačno',
            'quiet' => 'Tiha zona',
            'vip' => 'VIP',
            'high-table' => 'Visoki sto',
            'child-friendly' => 'Za djecu',
        ];

        foreach ($features as $slug => $name) {
            TableFeature::query()->updateOrCreate(['slug' => $slug], ['name' => $name]);
        }

        $venue = Venue::query()->where('slug', 'konoba-galeb')->first();
        if (! $venue) {
            return;
        }

        $author = User::query()->where('email', 'vlasnik@gdjecemo.me')->first();

        VenueReservationSetting::query()->updateOrCreate(['venue_id' => $venue->id], [
            'enabled' => true,
            'min_advance_minutes' => 30,
            'max_advance_days' => 30,
            'duration_minutes' => 90,
            'buffer_minutes' => 15,
            'min_party_size' => 1,
            'max_party_size' => 12,
            'cancellation_deadline_minutes' => 120,
            'auto_confirm' => true,
            'allow_table_selection' => true,
            'auto_assign' => true,
            'allow_larger_tables' => true,
            'waitlist_enabled' => true,
            'reminder_hours' => [24, 2],
        ]);

        if (! VenueFloorPlan::query()->where('venue_id', $venue->id)->exists()) {
            $plan = VenueFloorPlan::query()->create([
                'venue_id' => $venue->id,
                'name' => 'Glavni tlocrt',
                'canvas_width' => 960,
                'canvas_height' => 640,
            ]);

            $sala = $plan->zones()->create(['venue_id' => $venue->id, 'name' => 'Glavna sala', 'color' => '#0e4c49', 'sort_order' => 1]);
            $terrace = $plan->zones()->create(['venue_id' => $venue->id, 'name' => 'Terasa', 'color' => '#8a5a2b', 'sort_order' => 2]);
            $vip = $plan->zones()->create(['venue_id' => $venue->id, 'name' => 'VIP zona', 'color' => '#3d2b1f', 'sort_order' => 3]);

            $catalog = TableFeature::query()->pluck('id', 'slug');
            $rows = [
                ['T1', $sala->id, 1, 2, TableShape::Round, 80, 80, 96, 96, ['indoor', 'window']],
                ['T2', $sala->id, 2, 4, TableShape::Square, 240, 80, 104, 104, ['indoor', 'non-smoking']],
                ['T3', $terrace->id, 2, 4, TableShape::Square, 430, 90, 104, 104, ['outdoor', 'terrace']],
                ['T4', $sala->id, 4, 6, TableShape::Rectangle, 160, 280, 160, 96, ['indoor', 'booth']],
                ['T5', $vip->id, 6, 8, TableShape::Rectangle, 420, 280, 180, 110, ['indoor', 'vip', 'quiet']],
            ];

            $tables = [];
            foreach ($rows as [$name, $zoneId, $min, $max, $shape, $x, $y, $width, $height, $slugs]) {
                $table = VenueTable::query()->create([
                    'venue_id' => $venue->id,
                    'floor_plan_id' => $plan->id,
                    'zone_id' => $zoneId,
                    'name' => $name,
                    'capacity_min' => $min,
                    'capacity_max' => $max,
                    'shape' => $shape,
                    'position_x' => $x,
                    'position_y' => $y,
                    'width' => $width,
                    'height' => $height,
                ]);
                $table->features()->sync(collect($slugs)->map(fn ($slug) => $catalog[$slug])->all());
                TableQrCode::query()->create([
                    'venue_table_id' => $table->id,
                    'token' => Str::random(40),
                    'is_active' => true,
                ]);
                $tables[$name] = $table;
            }

            $combination = TableCombination::query()->create([
                'venue_id' => $venue->id,
                'name' => 'T4 + T5',
                'capacity_min' => 8,
                'capacity_max' => 12,
            ]);
            $combination->tables()->sync([$tables['T4']->id, $tables['T5']->id]);
        }

        if (! VenueContent::query()->where('slug', 'ziva-muzika-galeb')->exists() && $author) {
            $start = now()->addDays(9)->setTime(21, 0);
            VenueContent::query()->create([
                'venue_id' => $venue->id,
                'author_id' => $author->id,
                'type' => ContentType::Event,
                'title' => 'Živa muzika',
                'slug' => 'ziva-muzika-galeb',
                'body' => 'Gitarista svira na terasi od devet. Ulaz je slobodan, stolovi se rezervišu unaprijed.',
                'status' => ContentStatus::Published,
                'published_at' => now(),
                'event_start_at' => $start,
                'event_end_at' => $start->copy()->addHours(2),
                'event_category' => 'Muzika',
                'price' => 0,
                'capacity' => 40,
                'registration_mode' => 'registration',
                'organizer' => 'Konoba Galeb',
            ]);

            VenueContent::query()->create([
                'venue_id' => $venue->id,
                'author_id' => $author->id,
                'type' => ContentType::Promotion,
                'title' => 'Happy hour',
                'slug' => 'happy-hour-galeb',
                'body' => '20% na koktele.',
                'status' => ContentStatus::Published,
                'published_at' => now(),
                'valid_from' => now()->startOfDay(),
                'valid_until' => now()->addDays(40),
                'daily_start' => '17:00',
                'daily_end' => '19:00',
                'days_of_week' => [1, 2, 3, 4, 5],
                'terms' => 'Ne važi uz druge popuste.',
            ]);

            VenueContent::query()->create([
                'venue_id' => $venue->id,
                'author_id' => $author->id,
                'type' => ContentType::Announcement,
                'title' => 'Terasa je otvorena',
                'slug' => 'terasa-otvorena-galeb',
                'body' => 'Terasa radi od petka, kuhinja se zatvara u 22:00.',
                'status' => ContentStatus::Published,
                'priority' => 2,
                'published_at' => now(),
                'expires_at' => now()->addDays(21),
            ]);

            VenueContent::query()->create([
                'venue_id' => $venue->id,
                'author_id' => $author->id,
                'type' => ContentType::Post,
                'title' => 'Novi ljetni meni',
                'slug' => 'ljetni-meni-galeb',
                'body' => 'Dodali smo osam novih jela. Dostupna su od ovog petka.',
                'status' => ContentStatus::Published,
                'published_at' => now(),
            ]);
        }
    }
}
