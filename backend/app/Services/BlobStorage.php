<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class BlobStorage
{
    public static function enabled(): bool
    {
        return filled(config('services.blob.token')) && filled(config('services.blob.public_url'));
    }

    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return rtrim((string) config('services.blob.public_url'), '/').'/'.ltrim($path, '/');
    }

    public static function put(string $path, string $contents, string $mime): void
    {
        $token = (string) config('services.blob.token');
        $response = Http::withHeaders(self::headers($token, [
            'x-vercel-blob-access' => 'public',
            'x-content-type' => $mime,
            'x-add-random-suffix' => '0',
            'x-allow-overwrite' => '1',
            'x-content-length' => (string) strlen($contents),
        ]))->withBody($contents, $mime)->put(self::endpoint($path));

        if (! $response->successful()) {
            throw new RuntimeException('Čuvanje fotografije nije uspelo.');
        }
    }

    /**
     * @param  list<string>  $paths
     */
    public static function delete(array $paths): void
    {
        $urls = array_values(array_filter(array_map(
            fn (string $path) => self::url($path),
            array_values(array_filter($paths)),
        )));

        if ($urls === []) {
            return;
        }

        $token = (string) config('services.blob.token');
        Http::withHeaders(self::headers($token))
            ->acceptJson()
            ->post('https://vercel.com/api/blob/delete', ['urls' => $urls]);
    }

    /**
     * @param  array<string, string>  $extra
     * @return array<string, string>
     */
    private static function headers(string $token, array $extra = []): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'x-api-version' => '12',
            'x-vercel-blob-store-id' => self::storeId($token),
            ...$extra,
        ];
    }

    private static function endpoint(string $path): string
    {
        return 'https://vercel.com/api/blob/?'.http_build_query(['pathname' => $path]);
    }

    private static function storeId(string $token): string
    {
        $parts = explode('_', $token);

        return $parts[3] ?? '';
    }
}
