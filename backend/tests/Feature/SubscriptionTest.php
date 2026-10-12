<?php

namespace Tests\Feature;

use App\Enums\BusinessStatus;
use App\Models\Business;
use App\Models\Category;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_owner_switches_plans_and_the_limits_follow(): void
    {
        [$owner, $token, $business] = $this->owner();
        $category = Category::query()->create([
            'name' => 'Restorani',
            'slug' => 'restorani',
            'icon' => 'utensils',
            'sort_order' => 0,
        ]);

        $this->withToken($token)->getJson('/api/business/plans')
            ->assertOk()
            ->assertJsonPath('data.plans.0.slug', 'table')
            ->assertJsonPath('data.plans.0.price_cents', 2900)
            ->assertJsonPath('data.plans.1.slug', 'service')
            ->assertJsonPath('data.plans.2.slug', 'group')
            ->assertJsonPath('data.businesses.0.subscription', null);

        $first = $this->withToken($token)->postJson('/api/business/venues', $this->venuePayload($business, $category, 'Prvo'))
            ->assertCreated();
        $venueId = $first->json('data.id');

        $this->withToken($token)->postJson('/api/business/venues/'.$venueId.'/zones', ['name' => 'Sala'])
            ->assertCreated();

        $this->withToken($token)->postJson('/api/business/subscription', ['plan' => 'table'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.provider', 'test')
            ->assertJsonPath('data.plan', 'table')
            ->assertJsonPath('message', 'The plan is updated. Nothing was charged.');

        $this->withToken($token)->postJson('/api/business/venues', $this->venuePayload($business, $category, 'Drugo'))
            ->assertForbidden();
        $this->withToken($token)->postJson('/api/business/venues/'.$venueId.'/zones', ['name' => 'Bašta'])
            ->assertForbidden();
        $this->withToken($token)->getJson('/api/business/analytics')
            ->assertForbidden();

        $this->withToken($token)->postJson('/api/business/subscription', ['plan' => 'service'])
            ->assertOk()
            ->assertJsonPath('data.plan', 'service');

        $this->withToken($token)->postJson('/api/business/venues', $this->venuePayload($business, $category, 'Drugo'))
            ->assertCreated();
        $this->withToken($token)->postJson('/api/business/venues/'.$venueId.'/zones', ['name' => 'Bašta'])
            ->assertCreated();
        $this->withToken($token)->getJson('/api/business/analytics')->assertOk();

        $this->withToken($token)->postJson('/api/business/subscription', ['plan' => 'table'])
            ->assertOk()
            ->assertJsonPath('data.plan', 'table');
        $this->assertSame(2, Venue::query()->where('business_id', $business->id)->count());
        $this->withToken($token)->postJson('/api/business/venues', $this->venuePayload($business, $category, 'Treće'))
            ->assertForbidden();

        $this->withToken($token)->getJson('/api/business/plans', ['Accept-Language' => 'cnr'])
            ->assertOk()
            ->assertJsonPath('data.plans.0.name', 'Sto')
            ->assertJsonPath('data.plans.1.name', 'Usluga')
            ->assertJsonPath('data.plans.2.name', 'Grupa');

        $this->withToken($token)->postJson('/api/business/subscription/cancel')
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('message', 'The subscription is cancelled. Nothing was charged. The public page stays.');

        $this->withToken($token)->postJson('/api/business/venues/'.$venueId.'/zones', ['name' => 'Terasa'])
            ->assertForbidden();
        $this->assertSame(2, Venue::query()->where('business_id', $business->id)->count());

        $this->withToken($token)->postJson('/api/business/subscription', ['plan' => 'group'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.plan', 'group');
    }

    public function test_customer_cannot_open_plans(): void
    {
        $customer = User::factory()->create([
            'role_id' => Role::query()->where('slug', 'customer')->value('id'),
        ]);

        $this->withToken($customer->createToken('test')->plainTextToken)
            ->getJson('/api/business/plans')
            ->assertForbidden();
    }

    /**
     * @return array{0: User, 1: string, 2: Business}
     */
    private function owner(): array
    {
        $owner = User::factory()->create([
            'role_id' => Role::query()->where('slug', 'business')->value('id'),
        ]);
        $business = Business::query()->create([
            'owner_id' => $owner->id,
            'name' => 'Probni lokal',
            'slug' => 'probni-lokal',
            'status' => BusinessStatus::Approved,
            'approved_at' => now(),
        ]);
        $business->users()->attach($owner->id, ['role' => 'owner']);

        return [$owner, $owner->createToken('test')->plainTextToken, $business];
    }

    private function venuePayload(Business $business, Category $category, string $name): array
    {
        return [
            'business_id' => $business->id,
            'category_id' => $category->id,
            'name' => $name,
            'description' => 'Opis mjesta koji je dovoljno dug za prikaz na profilu i u rezultatima pretrage.',
            'address' => 'Glavna 1',
            'city' => 'Podgorica',
            'country' => 'Crna Gora',
            'latitude' => 42.44,
            'longitude' => 19.26,
            'price_level' => 2,
        ];
    }
}
