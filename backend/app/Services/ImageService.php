<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Image\ImageManager;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ImageService
{
    public function __construct(private readonly ImageManager $images) {}

    /**
     * @return array{path: string, thumb_path: string, width: int|null, height: int|null, size: int|null, mime: string}
     */
    public function store(UploadedFile $file, string $directory, int $maxWidth = 1600, int $thumbWidth = 640, ?int $minWidth = null, ?int $minHeight = null): array
    {
        $size = @getimagesize($file->getRealPath());
        $width = $size[0] ?? null;
        $height = $size[1] ?? null;

        if ($minWidth && $minHeight && ($width === null || $height === null || $width < $minWidth || $height < $minHeight)) {
            throw ValidationException::withMessages([
                'image' => "Fotografija mora biti najmanje {$minWidth}×{$minHeight} piksela.",
            ]);
        }

        $path = $this->images->fromUpload($file)
            ->orient()
            ->scale(width: $maxWidth)
            ->toWebp()
            ->quality(82)
            ->storePublicly($directory, 'public');

        $thumbPath = $this->images->fromUpload($file)
            ->orient()
            ->scale(width: $thumbWidth)
            ->toWebp()
            ->quality(76)
            ->storePublicly($directory.'/thumbs', 'public');

        if ($path === false || $thumbPath === false) {
            throw ValidationException::withMessages([
                'image' => 'Fotografiju nije moguće sačuvati.',
            ]);
        }

        if (BlobStorage::enabled()) {
            BlobStorage::put($path, (string) Storage::disk('public')->get($path), 'image/webp');
            BlobStorage::put($thumbPath, (string) Storage::disk('public')->get($thumbPath), 'image/webp');
        }

        return [
            'path' => $path,
            'thumb_path' => $thumbPath,
            'width' => $width,
            'height' => $height,
            'size' => $file->getSize(),
            'mime' => 'image/webp',
        ];
    }

    public function delete(?string ...$paths): void
    {
        $files = array_values(array_filter($paths));

        if ($files !== []) {
            Storage::disk('public')->delete($files);
            if (BlobStorage::enabled()) {
                BlobStorage::delete($files);
            }
        }
    }

    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (BlobStorage::enabled()) {
            return BlobStorage::url($path);
        }

        return Storage::disk('public')->url($path);
    }
}
