<?php

namespace Tests\Feature;

use App\Enums\BusinessStatus;
use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use App\Models\Business;
use App\Models\Category;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use App\Mail\VerificationCodeMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class PlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_registration_hashes_password_and_requires_verification_before_login(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'Maja',
            'last_name' => 'Ilić',
            'username' => 'maja',
            'email' => 'maja@example.com',
            'password' => 'Lozinka123',
            'password_confirmation' => 'Lozinka123',
        ]);

        $response->assertCreated()->assertJsonPath('success', true);
        $user = User::query()->where('email', 'maja@example.com')->firstOrFail();
        $this->assertNotSame('Lozinka123', $user->password);
        $this->assertTrue(Hash::check('Lozinka123', $user->password));
        $this->assertNull($user->email_verified_at);

        $this->postJson('/api/auth/login', [
            'email' => 'maja@example.com',
            'password' => 'Lozinka123',
        ])->assertForbidden()->assertJsonPath('success', false);

        $code = null;
        Mail::assertSent(VerificationCodeMail::class, function (VerificationCodeMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        $this->postJson('/api/auth/email/verify-code', [
            'email' => 'maja@example.com',
            'code' => $code,
        ])->assertOk()->assertJsonPath('data.user.email_verified_at', fn ($value) => $value !== null);
        $this->assertNotNull($user->fresh()->email_verified_at);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'maja@example.com',
            'password' => 'Lozinka123',
        ])->assertOk();

        $token = $login->json('data.token');
        $this->assertNotEmpty($token);

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_users_cannot_read_or_edit_another_profile(): void
    {
        $owner = $this->user('customer');
        $other = $this->user('customer');

        $this->withToken($owner->createToken('api')->plainTextToken)
            ->putJson('/api/me', [
                'first_name' => 'Novi',
                'last_name' => $owner->last_name,
                'username' => $owner->username,
                'email' => $other->email,
            ])->assertStatus(422);

        $this->assertSame($owner->first_name, $owner->fresh()->first_name);
    }

    public function test_search_filters_and_pagination_run_on_the_server(): void
    {
        $open = $this->makeVenue('Restoran Ada', 'Podgorica', 2, 4.6);
        $this->hours($open, 1, '08:00', '23:00');
        $closed = $this->makeVenue('Kafić Suton', 'Kotor', 3, 3.2);
        $this->hours($closed, 1, '08:00', '09:00');
        $this->makeVenue('Zebra Bistro', 'Podgorica', 2, 4.1);

        Carbon::setTestNow(Carbon::parse('2026-10-05 12:00:00', 'Europe/Podgorica'));

        $this->getJson('/api/venues?q=Zebra&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Zebra Bistro')
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/venues?city=Podgorica&category=restorani&min_rating=4&price_level=2&open=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Restoran Ada')
            ->assertJsonPath('data.0.is_open', true);

        Carbon::setTestNow();
    }

    public function test_customer_cannot_manage_venues_and_owner_cannot_edit_foreign_venue(): void
    {
        $customer = $this->user('customer');
        $owner = $this->user('business');
        $other = $this->user('business');
        $venue = $this->makeVenue('Samo moje', 'Nikšić', 2, 0, $owner);
        $foreign = $this->makeVenue('Tudje', 'Nikšić', 2, 0, $other);

        $this->withToken($customer->createToken('api')->plainTextToken)
            ->putJson('/api/business/venues/'.$venue->id, ['name' => 'Hak'])
            ->assertForbidden();

        $this->withToken($owner->createToken('api')->plainTextToken)
            ->putJson('/api/business/venues/'.$foreign->id, ['name' => 'Preuzeto'])
            ->assertForbidden();

        $this->assertSame('Tudje', $foreign->fresh()->name);

        $this->withToken($owner->createToken('api')->plainTextToken)
            ->putJson('/api/business/venues/'.$venue->id, ['name' => 'Samo moje novo', 'description' => $venue->description])
            ->assertOk();

        $this->assertSame('Samo moje novo', $venue->fresh()->name);
    }

    public function test_reviews_favorites_and_menu_respect_ownership(): void
    {
        $author = $this->user('customer');
        $other = $this->user('customer');
        $owner = $this->user('business');
        $rival = $this->user('business');
        $venue = $this->makeVenue('Meni kuća', 'Bar', 2, 0, $owner);
        $venue->update(['status' => VenueStatus::Published]);

        $token = $author->createToken('api')->plainTextToken;

        $this->withToken($token)->postJson('/api/venues/'.$venue->id.'/reviews', [
            'rating' => 5,
            'body' => 'Odličan ručak i mirna sala pored prozora.',
        ])->assertCreated();

        $this->withToken($token)->postJson('/api/venues/'.$venue->id.'/reviews', [
            'rating' => 4,
            'body' => 'Pokušaj druge recenzije ne treba da prođe.',
        ])->assertStatus(422);

        $reviewId = $venue->reviews()->first()->id;

        $this->withToken($other->createToken('api')->plainTextToken)
            ->putJson('/api/reviews/'.$reviewId, [
                'rating' => 1,
                'body' => 'Tuđa izmjena ne smije proći ovdje.',
            ])->assertForbidden();

        $this->withToken($token)->putJson('/api/reviews/'.$reviewId, [
            'rating' => 4,
            'body' => 'Ispravka: hrana je i dalje dobra, čekanje je duže.',
        ])->assertOk();

        $this->assertSame(4.0, (float) $venue->fresh()->rating_avg);
        $this->assertSame(1, $venue->fresh()->reviews_count);

        $this->withToken($owner->createToken('api')->plainTextToken)
            ->postJson('/api/reviews/'.$reviewId.'/response', ['body' => 'Hvala, proširićemo smjenu vikendom.'])
            ->assertOk();

        $this->withToken($rival->createToken('api')->plainTextToken)
            ->postJson('/api/reviews/'.$reviewId.'/response', ['body' => 'Ovo nije naš lokal.'])
            ->assertForbidden();

        $this->withToken($token)->deleteJson('/api/reviews/'.$reviewId)->assertOk();
        $this->assertSame(0, $venue->fresh()->reviews_count);

        $this->withToken($token)->postJson('/api/venues/'.$venue->id.'/reviews', [
            'rating' => 5,
            'body' => 'Nova recenzija nakon brisanja prethodne.',
        ])->assertCreated()->assertJsonPath('data.response', null);

        $this->withToken($token)->postJson('/api/venues/'.$venue->id.'/favorite')->assertOk();
        $this->withToken($token)->getJson('/api/me/favorites')->assertJsonPath('data.0.id', $venue->id);
        $this->withToken($other->createToken('api')->plainTextToken)
            ->getJson('/api/me/favorites')
            ->assertJsonPath('meta.total', 0);

        $menu = $this->withToken($owner->createToken('api')->plainTextToken)
            ->postJson('/api/business/venues/'.$venue->id.'/menu/categories', ['name' => 'Glavna jela'])
            ->assertCreated();

        $categoryId = $menu->json('data.id');

        $this->withToken($rival->createToken('api')->plainTextToken)
            ->postJson('/api/business/menu/categories/'.$categoryId.'/items', [
                'name' => 'Tuđe',
                'price' => 5,
            ])->assertForbidden();

        $this->withToken($owner->createToken('api')->plainTextToken)
            ->postJson('/api/business/menu/categories/'.$categoryId.'/items', [
                'name' => 'Pastrmka',
                'description' => 'Sa roštilja',
                'price' => 14,
                'is_available' => false,
            ])->assertCreated();

        $this->flushHeaders()->putJson('/api/business/venues/'.$venue->id.'/hours', [
            'intervals' => [
                ['day_of_week' => 1, 'opens_at' => '09:00', 'closes_at' => '14:00'],
                ['day_of_week' => 1, 'opens_at' => '17:00', 'closes_at' => '23:00'],
            ],
        ])->assertUnauthorized();

        $this->withToken($owner->createToken('api')->plainTextToken)
            ->putJson('/api/business/venues/'.$venue->id.'/hours', [
                'intervals' => [
                    ['day_of_week' => 1, 'opens_at' => '09:00', 'closes_at' => '14:00'],
                    ['day_of_week' => 1, 'opens_at' => '17:00', 'closes_at' => '23:00'],
                ],
            ])->assertOk();

        $this->assertCount(2, $venue->openingHours()->get());
    }

    public function test_admin_can_moderate_and_customer_cannot(): void
    {
        $admin = $this->user('admin');
        $customer = $this->user('customer');
        $owner = $this->user('business');
        $venue = $this->makeVenue('Za moderaciju', 'Cetinje', 2, 0, $owner);

        $this->withToken($customer->createToken('api')->plainTextToken)
            ->getJson('/api/admin/users')
            ->assertForbidden();

        $this->withToken($admin->createToken('api')->plainTextToken)
            ->putJson('/api/admin/venues/'.$venue->id, [
                'status' => 'suspended',
            ])->assertOk();

        $this->getJson('/api/venues?q=Za%20moderaciju')->assertOk()->assertJsonPath('meta.total', 0);

        $this->withToken($admin->createToken('api')->plainTextToken)
            ->postJson('/api/admin/categories', ['name' => 'Pekarnice', 'icon' => 'bread'])
            ->assertCreated();
    }

    public function test_disabled_user_loses_access_and_cover_upload_is_validated(): void
    {
        Storage::fake('public');
        $admin = $this->user('admin');
        $owner = $this->user('business');
        $venue = $this->makeVenue('Fotografija', 'Tivat', 2, 0, $owner);
        $token = $owner->createToken('api')->plainTextToken;

        $this->withToken($admin->createToken('api')->plainTextToken)
            ->putJson('/api/admin/users/'.$owner->id, ['is_active' => false])
            ->assertOk();

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();

        $activeOwner = $this->user('business');
        $ownVenue = $this->makeVenue('Druga fotografija', 'Tivat', 2, 0, $activeOwner);

        $this->withToken($activeOwner->createToken('api')->plainTextToken)
            ->post('/api/business/venues/'.$ownVenue->id.'/cover', [
                'image' => UploadedFile::fake()->image('cover.jpg', 1200, 800),
            ])->assertOk();

        $this->assertNotNull($ownVenue->fresh()->cover_path);
        Storage::disk('public')->assertExists($ownVenue->fresh()->cover_path);
    }

    public function test_overnight_hours_are_open_after_midnight(): void
    {
        $venue = $this->makeVenue('Noćni klub', 'Budva', 3, 0);
        $this->hours($venue, 5, '22:00', '04:00');

        Carbon::setTestNow(Carbon::parse('2026-10-10 01:30:00', 'Europe/Podgorica'));

        $this->getJson('/api/venues?q=Noćni&open=1')
            ->assertOk()
            ->assertJsonPath('data.0.is_open', true);

        Carbon::setTestNow();
    }

    private function user(string $role): User
    {
        return User::factory()->create([
            'role_id' => Role::query()->where('slug', $role)->value('id'),
        ]);
    }

    private function makeVenue(string $name, string $city, int $price, float $rating, ?User $owner = null): Venue
    {
        $owner ??= $this->user('business');
        $category = Category::query()->firstOrCreate(['slug' => 'restorani'], [
            'name' => 'Restorani',
            'icon' => 'utensils',
            'sort_order' => 0,
        ]);

        $business = Business::query()->create([
            'owner_id' => $owner->id,
            'name' => $owner->name.' biznis '.str()->random(4),
            'slug' => str($owner->username.'-'.$name)->slug().'-'.str()->random(3),
            'status' => BusinessStatus::Approved,
            'approved_at' => now(),
        ]);
        $business->users()->attach($owner->id, ['role' => 'owner']);

        return Venue::query()->create([
            'business_id' => $business->id,
            'category_id' => $category->id,
            'name' => $name,
            'slug' => str($name)->slug().'-'.str()->lower(str()->random(3)),
            'description' => 'Opis mjesta koji je dovoljno dug za prikaz na profilu i u rezultatima pretrage.',
            'address' => 'Glavna 1',
            'city' => $city,
            'country' => 'Crna Gora',
            'latitude' => 42.44,
            'longitude' => 19.26,
            'price_level' => $price,
            'status' => VenueStatus::Published,
            'verification_status' => VerificationStatus::Verified,
            'timezone' => 'Europe/Podgorica',
            'rating_avg' => $rating,
            'reviews_count' => $rating > 0 ? 2 : 0,
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
