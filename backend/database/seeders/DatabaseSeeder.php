<?php

namespace Database\Seeders;

use App\Enums\BusinessStatus;
use App\Enums\ReportStatus;
use App\Enums\ReviewStatus;
use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use App\Models\Amenity;
use App\Models\MenuCategory;
use App\Models\Business;
use App\Models\Category;
use App\Models\Promotion;
use App\Models\Report;
use App\Models\Review;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Models\Venue;
use App\Services\BlobStorage;
use App\Services\ReviewService;
use App\Services\SlugService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        $slugs = app(SlugService::class);
        $password = Hash::make('Lozinka123!');

        $roles = Role::query()->pluck('id', 'slug');

        $users = collect([
            ['admin', 'Ana', 'Radović', 'ana.admin', 'admin@gdjecemo.me', '+382 67 100 100'],
            ['business', 'Nikola', 'Vuković', 'nikola', 'vlasnik@gdjecemo.me', '+382 67 200 200'],
            ['business', 'Milica', 'Jovanović', 'milica', 'milica@gdjecemo.me', '+382 67 300 300'],
            ['customer', 'Petar', 'Petrović', 'petar', 'petar@gdjecemo.me', '+382 68 111 222'],
            ['customer', 'Jelena', 'Marković', 'jelena', 'jelena@gdjecemo.me', null],
            ['customer', 'Sara', 'Kovačević', 'sara', 'sara@gdjecemo.me', null],
            ['customer', 'Ivan', 'Popović', 'ivan', 'ivan@gdjecemo.me', '+382 69 333 444'],
            ['customer', 'Luka', 'Perović', 'luka', 'luka@gdjecemo.me', '+382 67 555 010'],
        ])->mapWithKeys(function (array $row) use ($roles, $password) {
            [$role, $first, $last, $username, $email, $phone] = $row;

            $user = User::query()->updateOrCreate(['email' => $email], [
                'role_id' => $roles[$role],
                'first_name' => $first,
                'last_name' => $last,
                'username' => $username,
                'phone' => $phone,
                'password' => $password,
                'email_verified_at' => now(),
                'is_active' => true,
            ]);

            return [$username => $user];
        });

        $categories = $this->categories($slugs);
        $amenities = $this->amenities($slugs);

        $adriatic = Business::query()->updateOrCreate(['slug' => 'adriatic-hospitality'], [
            'owner_id' => $users['nikola']->id,
            'name' => 'Adriatic Hospitality',
            'description' => 'Porodična grupa restorana i barova duž crnogorskog primorja i u Podgorici.',
            'phone' => '+382 67 200 200',
            'status' => BusinessStatus::Approved,
            'approved_at' => now()->subMonths(8),
        ]);
        $adriatic->users()->syncWithoutDetaching([$users['nikola']->id => ['role' => 'owner']]);

        $bakeryGroup = Business::query()->updateOrCreate(['slug' => 'kuca-hljeba'], [
            'owner_id' => $users['milica']->id,
            'name' => 'Kuća hljeba',
            'description' => 'Pekara i kafić sa proizvodnjom u Podgorici.',
            'phone' => '+382 67 300 300',
            'status' => BusinessStatus::Approved,
            'approved_at' => now()->subMonths(4),
        ]);
        $bakeryGroup->users()->syncWithoutDetaching([$users['milica']->id => ['role' => 'owner']]);

        $pending = Business::query()->updateOrCreate(['slug' => 'studio-luka'], [
            'owner_id' => $users['luka']->id,
            'name' => 'Studio Luka',
            'description' => 'Mali lounge u pripremi, čeka odobrenje platforme.',
            'phone' => '+382 67 555 010',
            'status' => BusinessStatus::Pending,
        ]);
        $pending->users()->syncWithoutDetaching([$users['luka']->id => ['role' => 'owner']]);

        $everyday = [];
        foreach (range(1, 7) as $day) {
            $everyday[$day] = [['08:00', '23:00']];
        }

        $venues = [
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Konoba Galeb',
                'category' => 'restorani',
                'subcategory' => 'ribarski',
                'city' => 'Kotor',
                'address' => 'Stari grad, ulica 1. bokeljske brigade 8',
                'latitude' => 42.42470,
                'longitude' => 18.77120,
                'price_level' => 3,
                'phone' => '+382 32 322 180',
                'email' => 'rezervacije@konobagaleb.me',
                'website' => 'https://konobagaleb.me',
                'instagram' => 'https://instagram.com/konobagaleb',
                'description' => 'Konoba Galeb drži ribu iz kotorskog zaliva i kratku kartu vina iz Crmnice. Ljeti se jede na terasi iznad gradskih zidina, zimi uz kamin u kamenoj sali. Rezervacija za večeru je praktično obavezna vikendom.',
                'hours' => $this->closedOn($everyday, 1),
                'amenities' => ['terasa', 'pogled-na-more', 'rezervacije', 'kartice', 'klimatizacija'],
                'featured' => true,
                'verified' => true,
                'views' => 1280,
                'menu_views' => 640,
                'palette' => [14, 74, 82],
                'menu' => [
                    'Hladno' => [
                        ['Salata od hobotnice', 'Masline, mladi luk i ulje od limuna.', 11.00],
                        ['Pršut i sir', 'Njeguški pršut sa sirom iz katuna.', 9.50],
                    ],
                    'Sa roštilja' => [
                        ['Orada', 'Cijela riba, blitva i krompir.', 24.00],
                        ['Lignje na žaru', 'Poslužene sa blitvom.', 16.00],
                    ],
                    'Desert' => [
                        ['Krempita', 'Listići i domaći krem.', 4.50],
                    ],
                ],
            ]),
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Kafana Pod Volat',
                'category' => 'restorani',
                'subcategory' => 'nacionalna-kuhinja',
                'city' => 'Podgorica',
                'address' => 'Njegoševa 22',
                'latitude' => 42.44190,
                'longitude' => 19.26340,
                'price_level' => 2,
                'phone' => '+382 20 230 145',
                'description' => 'Kafana Pod Volat kuva jela koja se naručuju unaprijed: teleća čorba, jagnjetina ispod sača i sezonsko zelje. Prostor je jednostavan, a kuhinja radi na drva. Dobro mjesto za ručak radnim danom.',
                'hours' => [1 => [['11:00', '16:00'], ['18:00', '23:00']], 2 => [['11:00', '16:00'], ['18:00', '23:00']], 3 => [['11:00', '16:00'], ['18:00', '23:00']], 4 => [['11:00', '16:00'], ['18:00', '23:00']], 5 => [['11:00', '16:00'], ['18:00', '23:30']], 6 => [['12:00', '23:30']], 7 => []],
                'amenities' => ['rezervacije', 'djeca', 'kartice', 'domaca-kuhinja'],
                'featured' => true,
                'verified' => true,
                'views' => 980,
                'menu_views' => 410,
                'palette' => [122, 62, 36],
                'menu' => [
                    'Čorbe' => [
                        ['Teleća čorba', 'Kuvana ujutru, servirana sa kašikom pavlake.', 4.00],
                    ],
                    'Ispod sača' => [
                        ['Jagnjetina', 'Za dvoje, sa mladim lukom. Naručiti do 15h.', 28.00],
                        ['Sarma od zelja', 'Sezonski, sa kiselim mlijekom.', 8.50],
                    ],
                ],
            ]),
            $this->venue($bakeryGroup, $categories, $amenities, $users['milica'], [
                'name' => 'Pekara Marko',
                'category' => 'pekare',
                'city' => 'Podgorica',
                'address' => 'Bulevar Ivana Crnojevića 41',
                'latitude' => 42.43720,
                'longitude' => 19.25980,
                'price_level' => 1,
                'phone' => '+382 20 241 900',
                'description' => 'Pekara Marko otvara se prije zore. U vitrini su raženi hljeb, kifla sa sirom i burek koji izlazi na svakih dvadeset minuta. Kafa se toči za šankom, bez rezervacija i bez žurbe poslije deset.',
                'hours' => [1 => [['06:00', '20:00']], 2 => [['06:00', '20:00']], 3 => [['06:00', '20:00']], 4 => [['06:00', '20:00']], 5 => [['06:00', '20:00']], 6 => [['06:30', '15:00']], 7 => []],
                'amenities' => ['wifi', 'takeaway', 'djeca'],
                'featured' => false,
                'verified' => true,
                'views' => 1540,
                'menu_views' => 220,
                'palette' => [176, 122, 62],
                'menu' => [
                    'Iz vitrine' => [
                        ['Burek sa mesom', 'Topli, iz rerne.', 1.80],
                        ['Kifla sa sirom', 'Bijeli hljeb i mladi sir.', 1.20],
                        ['Raženi hljeb', 'Štruca od 600 g.', 1.60],
                    ],
                    'Piće' => [
                        ['Domaća kafa', 'Kratka, u džezvi.', 1.00],
                    ],
                ],
            ]),
            $this->venue($bakeryGroup, $categories, $amenities, $users['milica'], [
                'name' => 'Kafić Knjižara',
                'category' => 'kafici',
                'city' => 'Podgorica',
                'address' => 'Slobode 14',
                'latitude' => 42.44280,
                'longitude' => 19.26610,
                'price_level' => 2,
                'phone' => '+382 20 228 330',
                'instagram' => 'https://instagram.com/kaficknjizara',
                'description' => 'Kafić Knjižara drži filter kafu, kratku listu kolača i police sa knjigama koje se mogu uzeti na čitanje. Ujutru je tiho, poslije podne se popunjava ljudima koji rade sa laptopom. Wi-Fi je stabilan, utičnice su uz zid.',
                'hours' => [1 => [['08:00', '21:00']], 2 => [['08:00', '21:00']], 3 => [['08:00', '21:00']], 4 => [['08:00', '21:00']], 5 => [['08:00', '22:00']], 6 => [['09:00', '22:00']], 7 => [['10:00', '18:00']]],
                'amenities' => ['wifi', 'klimatizacija', 'kartice', 'djeca'],
                'featured' => true,
                'verified' => true,
                'views' => 860,
                'menu_views' => 300,
                'palette' => [64, 86, 64],
                'menu' => [
                    'Kafa' => [
                        ['Filter', 'Dnevna mješavina, 200 ml.', 2.20],
                        ['Flat white', 'Dvostruki espresso i mlijeko.', 2.60],
                    ],
                    'Slatko' => [
                        ['Štrudla sa jabukom', 'Peče se ujutru.', 3.20],
                    ],
                ],
            ]),
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Bar Porto',
                'category' => 'barovi',
                'city' => 'Budva',
                'address' => 'Mediteranska 5',
                'latitude' => 42.29060,
                'longitude' => 18.84140,
                'price_level' => 3,
                'phone' => '+382 33 451 200',
                'instagram' => 'https://instagram.com/barporto',
                'description' => 'Bar Porto je vinsko-koktel bar jednu ulicu iza starog grada. Muzika je tiha do ponoći, zatim se pojača. Karta ima čaše iz Crmnice i četiri koktela koja se ne mijenjaju tokom sezone.',
                'hours' => [1 => [], 2 => [['17:00', '00:00']], 3 => [['17:00', '00:00']], 4 => [['17:00', '01:00']], 5 => [['17:00', '02:00']], 6 => [['17:00', '02:00']], 7 => [['18:00', '00:00']]],
                'amenities' => ['ziva-muzika', 'terasa', 'kartice', 'pogled-na-more'],
                'featured' => false,
                'verified' => true,
                'views' => 720,
                'menu_views' => 180,
                'palette' => [28, 36, 72],
                'menu' => [
                    'Čaše' => [
                        ['Vranac', 'Crmnica, čaša 150 ml.', 5.00],
                        ['Krstač', 'Hladan, čaša 150 ml.', 5.50],
                    ],
                    'Kokteli' => [
                        ['Porto sour', 'Rakija od kruške, limun, bjelance.', 9.00],
                    ],
                ],
            ]),
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Klub Maestral',
                'category' => 'klubovi',
                'city' => 'Budva',
                'address' => 'Slovenska obala 2',
                'latitude' => 42.28640,
                'longitude' => 18.84490,
                'price_level' => 3,
                'phone' => '+382 33 452 880',
                'website' => 'https://klubmaestral.me',
                'description' => 'Klub Maestral radi od kasnog proljeća. Ulaz je uz šetalište, program počinje poslije jedanaest, a vikendom ostaje otvoren do četiri. Garderoba je obavezna, rezervacija stola ide preko telefona.',
                'hours' => [1 => [], 2 => [], 3 => [], 4 => [['22:00', '03:00']], 5 => [['22:00', '04:00']], 6 => [['22:00', '04:00']], 7 => []],
                'amenities' => ['ziva-muzika', 'kartice', 'pogled-na-more'],
                'featured' => false,
                'verified' => true,
                'views' => 2100,
                'menu_views' => 90,
                'palette' => [48, 18, 42],
                'menu' => [
                    'Šank' => [
                        ['Pivo', 'Točeno, 0.4 l.', 3.50],
                        ['Vodka sour', 'Domaći limun.', 8.00],
                    ],
                ],
            ]),
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Picerija Forza',
                'category' => 'picerije',
                'city' => 'Podgorica',
                'address' => 'Vučedolska 9',
                'latitude' => 42.44610,
                'longitude' => 19.27020,
                'price_level' => 2,
                'phone' => '+382 20 655 210',
                'description' => 'Picerija Forza peče pite u kružnoj peći na drva. Tijesto odleži 48 sati. Dostava radi u krugu od tri kilometra, a u lokalu se čeka oko dvadeset minuta kada je puno.',
                'hours' => $everyday,
                'amenities' => ['dostava', 'djeca', 'terasa', 'kartice', 'wifi'],
                'featured' => false,
                'verified' => true,
                'views' => 640,
                'menu_views' => 510,
                'palette' => [168, 54, 40],
                'menu' => [
                    'Pizze' => [
                        ['Margarita', 'Paradajz, mocarela, bosiljak.', 7.50],
                        ['Diavola', 'Ljuta salama i med.', 9.00],
                        ['Crnogorska', 'Pršut, sir i rukola.', 10.50],
                    ],
                ],
            ]),
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Podrum Crmnica',
                'category' => 'vinski-barovi',
                'city' => 'Virpazar',
                'address' => 'Obala 3',
                'latitude' => 42.24580,
                'longitude' => 19.09140,
                'price_level' => 3,
                'phone' => '+382 69 410 770',
                'description' => 'Podrum Crmnica sipa vina iz okolnih sela, uz sir, masline i kratku priču o berbi ako pitate. Nema veliki meni. Subotom u podne je otvorena degustacija za grupe do osam ljudi.',
                'hours' => [1 => [], 2 => [['12:00', '20:00']], 3 => [['12:00', '20:00']], 4 => [['12:00', '20:00']], 5 => [['12:00', '22:00']], 6 => [['11:00', '22:00']], 7 => [['11:00', '18:00']]],
                'amenities' => ['rezervacije', 'terasa', 'kartice'],
                'featured' => true,
                'verified' => true,
                'views' => 430,
                'menu_views' => 150,
                'palette' => [92, 28, 40],
                'menu' => [
                    'Degustacija' => [
                        ['Tri čaše', 'Vranac, krstač i chardonnay.', 12.00],
                        ['Daska sireva', 'Tri sira i med.', 9.00],
                    ],
                ],
            ]),
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Aurora Kokteli',
                'category' => 'koktel-barovi',
                'city' => 'Tivat',
                'address' => 'Obala 18',
                'latitude' => 42.43420,
                'longitude' => 18.69580,
                'price_level' => 4,
                'phone' => '+382 32 671 440',
                'website' => 'https://aurorakokteli.me',
                'description' => 'Aurora je mali koktel bar sa osam mjesta za šankom i jednim stolom uz prozor. Meni se mijenja jednom mjesečno. Rezervacija se drži petnaest minuta, pa onda mjesto ide sljedećem gostu.',
                'hours' => [1 => [], 2 => [], 3 => [['18:00', '01:00']], 4 => [['18:00', '01:00']], 5 => [['18:00', '02:00']], 6 => [['18:00', '02:00']], 7 => [['18:00', '00:00']]],
                'amenities' => ['rezervacije', 'klimatizacija', 'kartice'],
                'featured' => false,
                'verified' => false,
                'views' => 260,
                'menu_views' => 80,
                'palette' => [20, 48, 78],
                'menu' => [
                    'Potpis' => [
                        ['Boka', 'Gin, pelin, grejp.', 12.00],
                        ['Noćna smjena', 'Rum, kafa, tonka.', 12.00],
                    ],
                ],
            ]),
            $this->venue($adriatic, $categories, $amenities, $users['nikola'], [
                'name' => 'Slatki kutak',
                'category' => 'poslasticarnice',
                'city' => 'Cetinje',
                'address' => 'Bajova 6',
                'latitude' => 42.39040,
                'longitude' => 18.92390,
                'price_level' => 2,
                'phone' => '+382 41 231 118',
                'description' => 'Slatki kutak pravi baklave, krempite i sezonske torte po porudžbini. Subotom se red pravi i prije otvaranja. Kafa je turska, a kolači se mogu ponijeti u kutiji.',
                'hours' => [1 => [['09:00', '20:00']], 2 => [['09:00', '20:00']], 3 => [['09:00', '20:00']], 4 => [['09:00', '20:00']], 5 => [['09:00', '20:00']], 6 => [['09:00', '20:00']], 7 => [['10:00', '16:00']]],
                'amenities' => ['takeaway', 'djeca', 'kartice'],
                'featured' => false,
                'verified' => true,
                'views' => 390,
                'menu_views' => 140,
                'palette' => [186, 112, 122],
                'menu' => [
                    'Kolači' => [
                        ['Baklava', 'Komad, orasi i med.', 2.80],
                        ['Krempita', 'Klasična, iz vitrine.', 2.50],
                    ],
                ],
            ]),
        ];

        $draft = Venue::query()->updateOrCreate(['slug' => 'lounge-scala'], [
            'business_id' => $adriatic->id,
            'category_id' => $categories['lounge']->id,
            'name' => 'Lounge Scala',
            'description' => 'Nacrt za lounge u Herceg Novom. Profil još nije objavljen.',
            'address' => 'Njegoševa 48',
            'city' => 'Herceg Novi',
            'country' => 'Crna Gora',
            'latitude' => 42.45720,
            'longitude' => 18.53140,
            'price_level' => 3,
            'status' => VenueStatus::Draft,
            'verification_status' => VerificationStatus::Unverified,
            'timezone' => 'Europe/Podgorica',
        ]);

        $reviewers = [$users['petar'], $users['jelena'], $users['sara'], $users['ivan']];
        $comments = [
            [5, 'Došli smo bez rezervacije u utorak i sačekali smo kratko. Riba je bila svježa, a osoblje je znalo da objasni odakle je ulov.'],
            [4, 'Dobro mjesto za sporiji ručak. Porcije su poštene, a račun je bio jasan. Vikendom je bučnije nego što piše u opisu.'],
            [5, 'Vraćamo se zbog osoblja. Pitali su da li nam odgovara sto pored prozora i nisu žurili sa računom.'],
            [3, 'Hrana je uredna, ali smo čekali kafu duže nego jelo. Za brzi sastanak nije idealno, za popodne jeste.'],
        ];

        foreach ($venues as $index => $venue) {
            if ($venue->status !== VenueStatus::Published) {
                continue;
            }

            foreach (array_slice($reviewers, 0, 3) as $offset => $reviewer) {
                $pair = $comments[($index + $offset) % count($comments)];
                Review::query()->updateOrCreate([
                    'user_id' => $reviewer->id,
                    'venue_id' => $venue->id,
                ], [
                    'rating' => $pair[0],
                    'body' => $pair[1],
                    'status' => ReviewStatus::Published,
                ]);
            }

            $firstReview = $venue->reviews()->first();
            if ($firstReview && $index % 2 === 0) {
                $ownerId = $venue->business()->value('owner_id');
                $firstReview->response()->updateOrCreate(['review_id' => $firstReview->id], [
                    'user_id' => $ownerId,
                    'body' => 'Hvala na riječima. Sačuvali smo napomenu za smjenu koja radi vikendom.',
                ]);
            }

            app(ReviewService::class)->recalculate($venue);
        }

        $users['petar']->favoriteVenues()->syncWithoutDetaching([
            $venues[0]->id,
            $venues[3]->id,
            $venues[6]->id,
        ]);

        $reported = Review::query()->where('venue_id', $venues[4]->id)->first();
        if ($reported) {
            Report::query()->updateOrCreate([
                'reporter_id' => $users['jelena']->id,
                'reportable_type' => 'review',
                'reportable_id' => $reported->id,
            ], [
                'reason' => 'misleading',
                'description' => 'Recenzija pominje događaj koji se nije desio tog dana. Molim provjeru.',
                'status' => ReportStatus::Pending,
            ]);
        }

        Setting::query()->updateOrCreate(['key' => 'site_name'], ['value' => 'Shall We']);
        Setting::query()->updateOrCreate(['key' => 'tagline'], ['value' => 'Restorani, kafići i barovi u Crnoj Gori, sa radnim vremenom i jelovnikom.']);
        Setting::query()->updateOrCreate(['key' => 'support_email'], ['value' => 'podrska@gdjecemo.me']);
        Setting::query()->updateOrCreate(['key' => 'default_city'], ['value' => 'Podgorica']);

        Promotion::query()->updateOrCreate(['title' => 'Večera u Kotoru'], [
            'subtitle' => 'Konoba Galeb drži terasu otvorenu do kraja oktobra.',
            'link_url' => '/venue/konoba-galeb',
            'is_active' => true,
            'sort_order' => 1,
            'image_path' => $venues[0]->cover_path,
        ]);

        Promotion::query()->updateOrCreate(['title' => 'Jutarnji hljeb'], [
            'subtitle' => 'Pekara Marko otvara se u šest. Burek izlazi na svakih dvadeset minuta.',
            'link_url' => '/venue/pekara-marko',
            'is_active' => true,
            'sort_order' => 2,
            'image_path' => $venues[2]->cover_path,
        ]);

        $this->call(HospitalitySeeder::class);

        unset($draft);
    }

    private function categories(SlugService $slugs): array
    {
        $tree = [
            ['Restorani', 'restorani', 'utensils', [
                ['Ribarski', 'ribarski'],
                ['Nacionalna kuhinja', 'nacionalna-kuhinja'],
            ]],
            ['Kafići', 'kafici', 'coffee', []],
            ['Barovi', 'barovi', 'wine', []],
            ['Klubovi', 'klubovi', 'music', []],
            ['Pekare', 'pekare', 'bread', []],
            ['Brza hrana', 'brza-hrana', 'burger', []],
            ['Picerije', 'picerije', 'pizza', []],
            ['Poslastičarnice', 'poslasticarnice', 'cake', []],
            ['Vinski barovi', 'vinski-barovi', 'grape', []],
            ['Koktel barovi', 'koktel-barovi', 'cocktail', []],
            ['Lounge', 'lounge', 'sofa', []],
            ['Ostalo', 'ostalo', 'spark', []],
        ];

        $map = [];

        foreach ($tree as $index => [$name, $slug, $icon, $children]) {
            $parent = Category::query()->updateOrCreate(['slug' => $slug], [
                'name' => $name,
                'icon' => $icon,
                'sort_order' => $index,
                'parent_id' => null,
                'translations' => \App\Support\ContentLocales::catalog()['categories'][$slug] ?? null,
            ]);
            $map[$slug] = $parent;

            foreach ($children as $childIndex => [$childName, $childSlug]) {
                $map[$childSlug] = Category::query()->updateOrCreate(['slug' => $childSlug], [
                    'name' => $childName,
                    'parent_id' => $parent->id,
                    'icon' => $icon,
                    'sort_order' => $childIndex,
                    'translations' => \App\Support\ContentLocales::catalog()['categories'][$childSlug] ?? null,
                ]);
            }
        }

        return $map;
    }

    private function amenities(SlugService $slugs): array
    {
        $rows = [
            ['Wi-Fi', 'wifi'],
            ['Terasa', 'terasa'],
            ['Parking', 'parking'],
            ['Dobro za djecu', 'djeca'],
            ['Kućni ljubimci', 'ljubimci'],
            ['Klima', 'klimatizacija'],
            ['Rezervacije', 'rezervacije'],
            ['Dostava', 'dostava'],
            ['Živa muzika', 'ziva-muzika'],
            ['Pogled na more', 'pogled-na-more'],
            ['Kartice', 'kartice'],
            ['Za ponijeti', 'takeaway'],
            ['Domaća kuhinja', 'domaca-kuhinja'],
            ['Pristup za kolica', 'pristup'],
        ];

        $map = [];
        foreach ($rows as [$name, $slug]) {
            $map[$slug] = Amenity::query()->updateOrCreate(['slug' => $slug], [
                'name' => $name,
                'icon' => $slug,
                'translations' => \App\Support\ContentLocales::catalog()['amenities'][$slug] ?? null,
            ]);
        }

        return $map;
    }

    private function venue(Business $business, array $categories, array $amenities, User $owner, array $data): Venue
    {
        $slug = Str::slug($data['name']);
        $cover = $this->paint($data['name'], $data['city'], $data['palette'], $slug.'-cover');
        $galleryA = $this->paint($data['name'], 'Enterijer', $this->shift($data['palette'], 24), $slug.'-1');
        $galleryB = $this->paint($data['name'], $data['city'], $this->shift($data['palette'], -18), $slug.'-2');

        $venue = Venue::query()->updateOrCreate(['slug' => $slug], [
            'business_id' => $business->id,
            'category_id' => $categories[$data['category']]->id,
            'subcategory_id' => isset($data['subcategory']) ? $categories[$data['subcategory']]->id : null,
            'name' => $data['name'],
            'description' => $data['description'],
            'address' => $data['address'],
            'city' => $data['city'],
            'country' => 'Crna Gora',
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'website' => $data['website'] ?? null,
            'instagram' => $data['instagram'] ?? null,
            'facebook' => $data['facebook'] ?? null,
            'price_level' => $data['price_level'],
            'cover_path' => $cover['path'],
            'cover_thumb_path' => $cover['thumb'],
            'status' => VenueStatus::Published,
            'verification_status' => ($data['verified'] ?? false) ? VerificationStatus::Verified : VerificationStatus::Unverified,
            'is_featured' => $data['featured'] ?? false,
            'timezone' => 'Europe/Podgorica',
            'profile_views' => $data['views'],
            'menu_views' => $data['menu_views'],
        ]);

        $venue->openingHours()->delete();
        foreach ($data['hours'] as $day => $intervals) {
            foreach ($intervals as [$opens, $closes]) {
                $venue->openingHours()->create([
                    'day_of_week' => $day,
                    'opens_at' => $opens,
                    'closes_at' => $closes,
                ]);
            }
        }

        $venue->amenities()->sync(collect($data['amenities'])->map(fn ($slug) => $amenities[$slug]->id)->all());

        $venue->images()->delete();
        foreach ([[$galleryA, 'Enterijer'], [$galleryB, $data['city']]] as $index => [$image, $alt]) {
            $venue->images()->create([
                'path' => $image['path'],
                'thumb_path' => $image['thumb'],
                'alt' => $data['name'].' — '.$alt,
                'width' => 1400,
                'height' => 900,
                'mime' => 'image/jpeg',
                'sort_order' => $index,
            ]);
        }

        $menu = $venue->menus()->firstOrCreate(['name' => 'Meni'], ['is_active' => true]);
        $menu->categories()->delete();
        $order = 0;
        foreach ($data['menu'] as $categoryName => $items) {
            $category = $menu->categories()->create([
                'name' => $categoryName,
                'station' => MenuCategory::stationForName($categoryName),
                'sort_order' => $order++,
            ]);
            foreach ($items as $itemIndex => [$name, $description, $price]) {
                $category->items()->create([
                    'name' => $name,
                    'description' => $description,
                    'price' => $price,
                    'is_available' => ! ($itemIndex === 2 && $order === 1),
                    'sort_order' => $itemIndex,
                ]);
            }
        }

        unset($owner);

        return $venue->refresh();
    }

    private function closedOn(array $hours, int $day): array
    {
        $hours[$day] = [];

        return $hours;
    }

    private function shift(array $rgb, int $amount): array
    {
        return array_map(fn ($channel) => max(0, min(255, $channel + $amount)), $rgb);
    }

    /**
     * @param  array{0:int,1:int,2:int}  $rgb
     * @return array{path: string, thumb: string}
     */
    private function paint(string $title, string $subtitle, array $rgb, string $name): array
    {
        Storage::disk('public')->makeDirectory('venues/seed');
        $path = 'venues/seed/'.$name.'.jpg';
        $thumb = 'venues/seed/'.$name.'-thumb.jpg';

        $this->render(storage_path('app/public/'.$path), 1400, 900, $title, $subtitle, $rgb);
        $this->render(storage_path('app/public/'.$thumb), 720, 460, $title, $subtitle, $rgb);

        if (BlobStorage::enabled()) {
            BlobStorage::put($path, (string) file_get_contents(storage_path('app/public/'.$path)), 'image/jpeg');
            BlobStorage::put($thumb, (string) file_get_contents(storage_path('app/public/'.$thumb)), 'image/jpeg');
        }

        return compact('path', 'thumb');
    }

    private function render(string $absolute, int $width, int $height, string $title, string $subtitle, array $rgb): void
    {
        $image = imagecreatetruecolor($width, $height);
        $base = imagecolorallocate($image, $rgb[0], $rgb[1], $rgb[2]);
        $band = imagecolorallocate($image, max(0, $rgb[0] - 30), max(0, $rgb[1] - 30), max(0, $rgb[2] - 30));
        $ink = imagecolorallocate($image, 255, 248, 240);
        imagefilledrectangle($image, 0, 0, $width, $height, $base);
        imagefilledrectangle($image, 0, (int) ($height * 0.62), $width, $height, $band);

        $font = '/System/Library/Fonts/Supplemental/Georgia.ttf';
        if (is_file($font)) {
            imagettftext($image, (int) ($width / 28), 0, (int) ($width * 0.06), (int) ($height * 0.78), $ink, $font, $title);
            imagettftext($image, (int) ($width / 48), 0, (int) ($width * 0.06), (int) ($height * 0.88), $ink, $font, $subtitle);
        } else {
            imagestring($image, 5, 40, (int) ($height * 0.72), $title, $ink);
            imagestring($image, 4, 40, (int) ($height * 0.82), $subtitle, $ink);
        }

        imagejpeg($image, $absolute, 86);
        imagedestroy($image);
    }
}
