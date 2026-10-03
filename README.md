# Gdje ćemo

Platforma za otkrivanje lokalnih mjesta u Crnoj Gori: restorani, kafići, barovi, klubovi i ostali lokali. Frontend je Next.js i razgovara samo sa Laravel API-jem.

## Pokretanje

Potrebni su PHP 8.3+, Composer, Node.js 20+, i MySQL 8.

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gdje_cemo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

U drugom terminalu:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Aplikacija je na [http://localhost:3000](http://localhost:3000), API na [http://localhost:8000](http://localhost:8000).

Vlasnik na javnom profilu mjesta uređuje tlocrt i stolove, prima rezervacije i objavljuje događaje, objave, obavještenja i promocije. Gost bira sto na `/venue/konoba-galeb/reserve`, a narudžbinu preko QR koda stola otvara iz biznis tlocrta. Događaji su i na `/events`. Zakazani sadržaj i podsjetnici na rezervaciju idu kroz `php artisan hospitality:sync` (zakazano svakog minuta kad radi scheduler).

Ako MySQL klijent nije na `PATH`, kod DBngin-a je često `/Users/Shared/DBngin/mysql/8.0.33/bin/mysql`. U `.env` fajlu korisnik je `root` sa praznom lozinkom, baza `gdje_cemo`, host `127.0.0.1`.

## Demo nalozi

Lozinka za sve naloge iz seeda je `Lozinka123!`.

| Email | Uloga |
| --- | --- |
| admin@gdjecemo.me | administrator |
| vlasnik@gdjecemo.me | vlasnik, Adriatic Hospitality |
| milica@gdjecemo.me | vlasnica, Kuća hljeba |
| petar@gdjecemo.me | korisnik |
| luka@gdjecemo.me | korisnik sa zahtjevom za biznis na čekanju |

Mailer piše u `backend/storage/logs/laravel.log`. Link za potvrdu emaila i reset lozinke je u tom fajlu. Red je `sync`, tako da se poruka pojavi odmah.

## Testovi

```bash
cd backend
php artisan test
```

Testovi koriste bazu `gdje_cemo_test`. Kreirajte je prije prvog pokretanja.
