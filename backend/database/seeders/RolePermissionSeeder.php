<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'profile.manage' => 'Uređivanje profila',
            'reviews.create' => 'Pisanje recenzija',
            'reviews.respond' => 'Odgovor na recenzije',
            'reviews.moderate' => 'Moderacija recenzija',
            'favorites.manage' => 'Čuvanje mjesta',
            'reports.create' => 'Prijava sadržaja',
            'venues.manage' => 'Upravljanje mjestima',
            'menu.manage' => 'Upravljanje menijem',
            'hours.manage' => 'Upravljanje radnim vremenom',
            'users.manage' => 'Upravljanje korisnicima',
            'platform.manage' => 'Podešavanja platforme',
            'reservations.manage' => 'Upravljanje rezervacijama',
            'content.manage' => 'Upravljanje sadržajem',
            'orders.manage' => 'Upravljanje narudžbinama',
        ];

        foreach ($permissions as $slug => $name) {
            Permission::query()->updateOrCreate(['slug' => $slug], ['name' => $name]);
        }

        $map = [
            'customer' => ['Korisnik', ['profile.manage', 'reviews.create', 'favorites.manage', 'reports.create']],
            'business' => ['Biznis', ['profile.manage', 'reviews.create', 'favorites.manage', 'reports.create', 'venues.manage', 'reviews.respond', 'menu.manage', 'hours.manage', 'reservations.manage', 'content.manage', 'orders.manage']],
            'admin' => ['Administrator', array_keys($permissions)],
        ];

        foreach ($map as $slug => [$name, $granted]) {
            $role = Role::query()->updateOrCreate(['slug' => $slug], ['name' => $name]);
            $role->permissions()->sync(
                Permission::query()->whereIn('slug', $granted)->pluck('id')
            );
        }
    }
}
