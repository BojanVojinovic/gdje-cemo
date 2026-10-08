<?php

namespace App\Support;

use Illuminate\Http\Request;

class ContentLocales
{
    public const SOURCE = 'cnr';

    /** @var list<string> */
    public const CODES = ['en', 'cnr', 'ru', 'it', 'de', 'fr', 'es'];

    public static function normalize(?string $locale): string
    {
        $code = strtolower(substr((string) $locale, 0, 5));

        return in_array($code, self::CODES, true) ? $code : 'en';
    }

    public static function fromRequest(?Request $request = null): string
    {
        $header = strtolower((string) ($request ?? request())->header('Accept-Language'));

        foreach (self::CODES as $code) {
            if ($header !== '' && str_starts_with($header, $code)) {
                return $code;
            }
        }

        return 'en';
    }

    public static function text(?string $source, mixed $translations, string $field, ?string $locale = null): ?string
    {
        $locale ??= self::fromRequest();
        if ($locale === self::SOURCE) {
            return $source;
        }

        $bag = is_array($translations) ? $translations : [];
        $value = trim((string) ($bag[$locale][$field] ?? ''));

        return $value !== '' ? $value : $source;
    }

    /**
     * @param  array<string, mixed>|null  $existing
     * @param  list<string>  $fields
     * @return array<string, array<string, string>>
     */
    public static function merge(?array $existing, mixed $input, array $fields): array
    {
        $result = [];
        foreach ($existing ?? [] as $code => $row) {
            if (! is_string($code) || ! is_array($row) || ! in_array($code, self::CODES, true) || $code === self::SOURCE) {
                continue;
            }
            $kept = [];
            foreach ($fields as $field) {
                $value = trim((string) ($row[$field] ?? ''));
                if ($value !== '') {
                    $kept[$field] = $value;
                }
            }
            if ($kept !== []) {
                $result[$code] = $kept;
            }
        }

        if (! is_array($input)) {
            return $result;
        }

        foreach (self::CODES as $code) {
            if ($code === self::SOURCE || ! isset($input[$code]) || ! is_array($input[$code])) {
                continue;
            }
            $row = $result[$code] ?? [];
            foreach ($fields as $field) {
                if (! array_key_exists($field, $input[$code])) {
                    continue;
                }
                $value = trim((string) $input[$code][$field]);
                if ($value === '') {
                    unset($row[$field]);
                } else {
                    $row[$field] = $value;
                }
            }
            if ($row === []) {
                unset($result[$code]);
            } else {
                $result[$code] = $row;
            }
        }

        return $result;
    }

    /**
     * @return array<string, array<string, array<string, array<string, string>>>>
     */
    public static function catalog(): array
    {
        $pack = function (array $names): array {
            $bag = [];
            foreach ($names as $locale => $name) {
                $bag[$locale] = ['name' => $name];
            }

            return $bag;
        };

        $categories = [
            'restorani' => ['en' => 'Restaurants', 'ru' => 'Рестораны', 'it' => 'Ristoranti', 'de' => 'Restaurants', 'fr' => 'Restaurants', 'es' => 'Restaurantes'],
            'ribarski' => ['en' => 'Seafood', 'ru' => 'Рыбная кухня', 'it' => 'Pesce', 'de' => 'Fischküche', 'fr' => 'Poisson', 'es' => 'Pescado'],
            'nacionalna-kuhinja' => ['en' => 'National cuisine', 'ru' => 'Национальная кухня', 'it' => 'Cucina nazionale', 'de' => 'Nationale Küche', 'fr' => 'Cuisine nationale', 'es' => 'Cocina nacional'],
            'kafici' => ['en' => 'Cafés', 'ru' => 'Кафе', 'it' => 'Caffè', 'de' => 'Cafés', 'fr' => 'Cafés', 'es' => 'Cafés'],
            'barovi' => ['en' => 'Bars', 'ru' => 'Бары', 'it' => 'Bar', 'de' => 'Bars', 'fr' => 'Bars', 'es' => 'Bares'],
            'klubovi' => ['en' => 'Clubs', 'ru' => 'Клубы', 'it' => 'Locali', 'de' => 'Clubs', 'fr' => 'Clubs', 'es' => 'Clubes'],
            'pekare' => ['en' => 'Bakeries', 'ru' => 'Пекарни', 'it' => 'Panetterie', 'de' => 'Bäckereien', 'fr' => 'Boulangeries', 'es' => 'Panaderías'],
            'brza-hrana' => ['en' => 'Fast food', 'ru' => 'Фастфуд', 'it' => 'Fast food', 'de' => 'Schnellimbiss', 'fr' => 'Restauration rapide', 'es' => 'Comida rápida'],
            'picerije' => ['en' => 'Pizzerias', 'ru' => 'Пиццерии', 'it' => 'Pizzerie', 'de' => 'Pizzerien', 'fr' => 'Pizzerias', 'es' => 'Pizzerías'],
            'poslasticarnice' => ['en' => 'Pastry shops', 'ru' => 'Кондитерские', 'it' => 'Pasticcerie', 'de' => 'Konditoreien', 'fr' => 'Pâtisseries', 'es' => 'Pastelerías'],
            'vinski-barovi' => ['en' => 'Wine bars', 'ru' => 'Винные бары', 'it' => 'Wine bar', 'de' => 'Weinbars', 'fr' => 'Bars à vin', 'es' => 'Bares de vino'],
            'koktel-barovi' => ['en' => 'Cocktail bars', 'ru' => 'Коктейль-бары', 'it' => 'Cocktail bar', 'de' => 'Cocktailbars', 'fr' => 'Bars à cocktails', 'es' => 'Bares de cócteles'],
            'lounge' => ['en' => 'Lounge', 'ru' => 'Лаунж', 'it' => 'Lounge', 'de' => 'Lounge', 'fr' => 'Lounge', 'es' => 'Lounge'],
            'ostalo' => ['en' => 'Other', 'ru' => 'Другое', 'it' => 'Altro', 'de' => 'Sonstiges', 'fr' => 'Autre', 'es' => 'Otros'],
        ];
        $amenities = [
            'wifi' => ['en' => 'Wi-Fi', 'ru' => 'Wi-Fi', 'it' => 'Wi-Fi', 'de' => 'WLAN', 'fr' => 'Wi-Fi', 'es' => 'Wi-Fi'],
            'terasa' => ['en' => 'Terrace', 'ru' => 'Терраса', 'it' => 'Terrazza', 'de' => 'Terrasse', 'fr' => 'Terrasse', 'es' => 'Terraza'],
            'parking' => ['en' => 'Parking', 'ru' => 'Парковка', 'it' => 'Parcheggio', 'de' => 'Parkplatz', 'fr' => 'Parking', 'es' => 'Aparcamiento'],
            'djeca' => ['en' => 'Good for children', 'ru' => 'Подходит для детей', 'it' => 'Adatto ai bambini', 'de' => 'Kinderfreundlich', 'fr' => 'Adapté aux enfants', 'es' => 'Apto para niños'],
            'ljubimci' => ['en' => 'Pets', 'ru' => 'Можно с питомцами', 'it' => 'Animali ammessi', 'de' => 'Haustiere', 'fr' => 'Animaux acceptés', 'es' => 'Mascotas'],
            'klimatizacija' => ['en' => 'Air conditioning', 'ru' => 'Кондиционер', 'it' => 'Aria condizionata', 'de' => 'Klimaanlage', 'fr' => 'Climatisation', 'es' => 'Aire acondicionado'],
            'rezervacije' => ['en' => 'Reservations', 'ru' => 'Бронирование', 'it' => 'Prenotazioni', 'de' => 'Reservierungen', 'fr' => 'Réservations', 'es' => 'Reservas'],
            'dostava' => ['en' => 'Delivery', 'ru' => 'Доставка', 'it' => 'Consegna', 'de' => 'Lieferung', 'fr' => 'Livraison', 'es' => 'Entrega'],
            'ziva-muzika' => ['en' => 'Live music', 'ru' => 'Живая музыка', 'it' => 'Musica dal vivo', 'de' => 'Livemusik', 'fr' => 'Musique live', 'es' => 'Música en vivo'],
            'pogled-na-more' => ['en' => 'Sea view', 'ru' => 'Вид на море', 'it' => 'Vista mare', 'de' => 'Meerblick', 'fr' => 'Vue sur la mer', 'es' => 'Vista al mar'],
            'kartice' => ['en' => 'Cards', 'ru' => 'Карты', 'it' => 'Carte', 'de' => 'Karten', 'fr' => 'Cartes', 'es' => 'Tarjetas'],
            'takeaway' => ['en' => 'Takeaway', 'ru' => 'Навынос', 'it' => 'Asporto', 'de' => 'Zum Mitnehmen', 'fr' => 'À emporter', 'es' => 'Para llevar'],
            'domaca-kuhinja' => ['en' => 'Home cooking', 'ru' => 'Домашняя кухня', 'it' => 'Cucina casalinga', 'de' => 'Hausmannskost', 'fr' => 'Cuisine maison', 'es' => 'Cocina casera'],
            'pristup' => ['en' => 'Wheelchair access', 'ru' => 'Доступ для колясок', 'it' => 'Accesso per sedie a rotelle', 'de' => 'Rollstuhlgerecht', 'fr' => 'Accès fauteuil roulant', 'es' => 'Acceso para sillas de ruedas'],
        ];

        return [
            'categories' => array_map($pack, $categories),
            'amenities' => array_map($pack, $amenities),
        ];
    }
}
