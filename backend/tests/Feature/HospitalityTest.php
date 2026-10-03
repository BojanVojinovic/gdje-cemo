<?php

namespace Tests\Feature;

use App\Enums\BusinessStatus;
use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use App\Models\Business;
use App\Models\Category;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class HospitalityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        Carbon::setTestNow(Carbon::parse('2026-10-02 10:00:00', 'Europe/Podgorica'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_availability_capacity_double_booking_and_table_snapshots(): void
    {
        $owner = $this->user('business');
        $guest = $this->user('customer');
        $other = $this->user('customer');
        $venue = $this->makeVenue($owner);
        $this->hours($venue, 2, '12:00', '23:00');
        $token = $owner->createToken('api')->plainTextToken;

        $zone = $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/zones', [
            'name' => 'Sala',
        ])->assertCreated()->json('data.id');

        $small = $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/tables', [
            'name' => 'T1',
            'zone_id' => $zone,
            'capacity_min' => 1,
            'capacity_max' => 2,
            'shape' => 'round',
        ])->assertCreated()->json('data');

        $fit = $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/tables', [
            'name' => 'T2',
            'zone_id' => $zone,
            'capacity_min' => 4,
            'capacity_max' => 4,
            'shape' => 'square',
        ])->assertCreated()->json('data');

        $this->withToken($token)->putJson('/api/business/venues/'.$venue->id.'/reservation-settings', [
            'enabled' => true,
            'min_advance_minutes' => 0,
            'allow_table_selection' => true,
            'auto_confirm' => true,
            'allow_larger_tables' => false,
        ])->assertOk();

        $start = '2026-10-06 18:00:00';
        $this->flushHeaders();
        $available = $this->getJson('/api/venues/'.$venue->id.'/availability?start_at='.urlencode($start).'&party_size=4')
            ->assertOk()
            ->json('data.tables');

        $this->assertSame([$fit['id']], collect($available)->pluck('id')->all());

        $plan = $this->getJson('/api/venues/'.$venue->id.'/floor-plan')->assertOk()->json('data');
        $this->assertNull($plan['tables'][0]['qr_token']);
        $this->assertArrayNotHasKey('guest_phone', $plan['tables'][0]);

        $reservation = $this->withToken($guest->createToken('api')->plainTextToken)
            ->postJson('/api/venues/'.$venue->id.'/reservations', [
                'start_at' => $start,
                'party_size' => 4,
                'table_id' => $fit['id'],
            ])->assertCreated()->json('data');

        $this->assertSame('T2', $reservation['table_name']);
        $this->assertSame('confirmed', $reservation['status']);

        $this->withToken($other->createToken('api')->plainTextToken)
            ->postJson('/api/venues/'.$venue->id.'/reservations', [
                'start_at' => $start,
                'party_size' => 4,
                'table_id' => $fit['id'],
            ])->assertStatus(422);

        $this->withToken($token)->putJson('/api/business/tables/'.$fit['id'], [
            'name' => 'Prozor',
        ])->assertOk();

        $this->assertSame('T2', Reservation::query()->find($reservation['id'])->table_name_snapshot);
        $this->assertNotSame($small['id'], $fit['id']);
    }

    public function test_events_hide_drafts_and_enforce_capacity(): void
    {
        $owner = $this->user('business');
        $first = $this->user('customer');
        $second = $this->user('customer');
        $venue = $this->makeVenue($owner);
        $token = $owner->createToken('api')->plainTextToken;

        $this->withToken($token)->postJson('/api/business/content', [
            'venue_id' => $venue->id,
            'type' => 'event',
            'title' => 'Skriveni događaj',
            'status' => 'draft',
            'event_start_at' => '2026-10-20 20:00:00',
            'event_end_at' => '2026-10-20 22:00:00',
        ])->assertCreated();

        $published = $this->withToken($token)->postJson('/api/business/content', [
            'venue_id' => $venue->id,
            'type' => 'event',
            'title' => 'Kviz večer',
            'status' => 'published',
            'event_start_at' => '2026-10-20 20:00:00',
            'event_end_at' => '2026-10-20 22:00:00',
            'capacity' => 1,
            'registration_mode' => 'capacity',
            'event_category' => 'Kviz',
        ])->assertCreated()->json('data');

        $titles = collect($this->getJson('/api/events')->assertOk()->json('data'))->pluck('title');
        $this->assertTrue($titles->contains('Kviz večer'));
        $this->assertFalse($titles->contains('Skriveni događaj'));

        $this->withToken($first->createToken('api')->plainTextToken)
            ->postJson('/api/content/'.$published['id'].'/register')
            ->assertOk();

        $this->withToken($second->createToken('api')->plainTextToken)
            ->postJson('/api/content/'.$published['id'].'/register')
            ->assertStatus(422);

        $this->withToken($second->createToken('api')->plainTextToken)
            ->postJson('/api/reports', [
                'reportable_type' => 'venue_content',
                'reportable_id' => $published['id'],
                'reason' => 'incorrect_information',
            ])->assertCreated();
    }

    public function test_qr_session_creates_an_order_with_menu_snapshot(): void
    {
        $owner = $this->user('business');
        $guest = $this->user('customer');
        $venue = $this->makeVenue($owner);
        $token = $owner->createToken('api')->plainTextToken;

        $table = $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/tables', [
            'name' => 'T12',
            'capacity_min' => 2,
            'capacity_max' => 4,
        ])->assertCreated()->json('data');

        $category = $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/menu/categories', [
            'name' => 'Kuhinja',
        ])->assertCreated()->json('data.id');

        $item = $this->withToken($token)->postJson('/api/business/menu/categories/'.$category.'/items', [
            'name' => 'Lignje',
            'price' => 14,
        ])->assertCreated()->json('data.id');

        $session = $this->withToken($guest->createToken('api')->plainTextToken)
            ->postJson('/api/tables/qr/'.$table['qr_token'].'/session')
            ->assertOk()
            ->json('data.session_id');

        $order = $this->withToken($guest->createToken('api')->plainTextToken)
            ->postJson('/api/sessions/'.$session.'/orders', [
                'items' => [['menu_item_id' => $item, 'quantity' => 2]],
            ])->assertCreated()->json('data');

        $this->assertSame('Lignje', $order['items'][0]['name_snapshot']);
        $this->assertEquals(14, $order['items'][0]['price_snapshot']);
    }

    private function user(string $role): User
    {
        return User::factory()->create([
            'role_id' => Role::query()->where('slug', $role)->value('id'),
            'email_verified_at' => now(),
        ]);
    }

    private function makeVenue(User $owner): Venue
    {
        $category = Category::query()->firstOrCreate(['slug' => 'restorani'], [
            'name' => 'Restorani',
            'icon' => 'utensils',
            'sort_order' => 0,
        ]);
        $business = Business::query()->create([
            'owner_id' => $owner->id,
            'name' => 'Biznis '.$owner->id,
            'slug' => 'biznis-'.$owner->id,
            'status' => BusinessStatus::Approved,
            'approved_at' => now(),
        ]);
        $business->users()->attach($owner->id, ['role' => 'owner']);

        return Venue::query()->create([
            'business_id' => $business->id,
            'category_id' => $category->id,
            'name' => 'Test restoran '.$owner->id,
            'slug' => 'test-restoran-'.$owner->id,
            'description' => 'Opis mjesta koji je dovoljno dug za prikaz na profilu i u rezultatima pretrage.',
            'address' => 'Glavna 1',
            'city' => 'Kotor',
            'country' => 'Crna Gora',
            'latitude' => 42.42,
            'longitude' => 18.77,
            'price_level' => 2,
            'status' => VenueStatus::Published,
            'verification_status' => VerificationStatus::Verified,
            'timezone' => 'Europe/Podgorica',
        ]);
    }

    private function hours(Venue $venue, int $day, string $opens, string $closes): void
    {
        $venue->openingHours()->create([
            'day_of_week' => $day,
            'opens_at' => $opens,
            'closes_at' => $closes,
        ]);
    }
}
