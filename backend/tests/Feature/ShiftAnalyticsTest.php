<?php

namespace Tests\Feature;

use App\Enums\BusinessStatus;
use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use App\Models\Category;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ShiftAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        Carbon::setTestNow(Carbon::parse('2026-10-06 10:00:00', 'Europe/Podgorica'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_staff_can_swap_a_shift_and_the_calendar_keeps_both_names(): void
    {
        $owner = $this->user('business');
        $cook = $this->user('customer');
        $waiter = $this->user('customer');
        $venue = $this->makeVenue($owner);
        $token = $owner->createToken('api')->plainTextToken;

        $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/staff', [
            'email' => $cook->email,
            'roles' => ['kitchen'],
        ])->assertCreated();
        $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/staff', [
            'email' => $waiter->email,
            'roles' => ['waiter'],
        ])->assertCreated();

        $created = $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/shifts', [
            'user_id' => $cook->id,
            'role' => 'kitchen',
            'starts_at' => '2026-10-07 18:00:00',
            'ends_at' => '2026-10-07 23:00:00',
        ])->assertCreated()->json('data');

        $this->assertSame($cook->id, $created['planned']['id']);
        $this->assertNull($created['covering']);

        $this->flushHeaders();
        $swap = $this->withToken($cook->createToken('api')->plainTextToken)->postJson('/api/me/shifts/'.$created['id'].'/swaps', [
            'to_user_id' => $waiter->id,
            'note' => 'Imam ispit.',
        ])->assertCreated()->json('data');

        $this->withToken($waiter->createToken('api')->plainTextToken)
            ->postJson('/api/me/shift-swaps/'.$swap['id'].'/accept')
            ->assertOk()
            ->assertJsonPath('data.planned.id', $cook->id)
            ->assertJsonPath('data.covering.id', $waiter->id);

        $board = $this->withToken($token)->getJson('/api/business/venues/'.$venue->id.'/shifts')->assertOk()->json('data.shifts.0');
        $this->assertSame($cook->id, $board['planned']['id']);
        $this->assertSame($waiter->id, $board['covering']['id']);

        $mine = $this->withToken($waiter->createToken('api')->plainTextToken)->getJson('/api/me/shifts')->assertOk()->json('data.shifts');
        $this->assertSame($waiter->id, $mine[0]['working']['id']);
        $this->assertSame($cook->id, $mine[0]['planned']['id']);
    }

    public function test_overlapping_shift_is_rejected_and_analytics_counts_a_reservation(): void
    {
        $owner = $this->user('business');
        $cook = $this->user('customer');
        $venue = $this->makeVenue($owner);
        $token = $owner->createToken('api')->plainTextToken;
        $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/staff', [
            'email' => $cook->email,
            'roles' => ['kitchen'],
        ])->assertCreated();
        $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/shifts', [
            'user_id' => $cook->id,
            'starts_at' => '2026-10-07 18:00:00',
            'ends_at' => '2026-10-07 23:00:00',
        ])->assertCreated();
        $this->withToken($token)->postJson('/api/business/venues/'.$venue->id.'/shifts', [
            'user_id' => $cook->id,
            'starts_at' => '2026-10-07 22:00:00',
            'ends_at' => '2026-10-08 01:00:00',
        ])->assertStatus(422);

        Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $cook->id,
            'table_ids' => [],
            'party_size' => 3,
            'start_at' => '2026-10-08 19:00:00',
            'end_at' => '2026-10-08 21:00:00',
            'status' => 'pending',
            'guest_name' => 'Ana',
            'table_name_snapshot' => 'T1',
        ]);

        $this->withToken($token)->getJson('/api/business/analytics?days=30')
            ->assertOk()
            ->assertJsonPath('data.period.reservations', 1)
            ->assertJsonPath('data.period.covers', 3);
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
        $business = \App\Models\Business::query()->create([
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
}
