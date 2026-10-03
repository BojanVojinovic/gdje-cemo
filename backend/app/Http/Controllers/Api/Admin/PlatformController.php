<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PromotionResource;
use App\Models\Promotion;
use App\Models\Setting;
use App\Services\ImageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlatformController extends Controller
{
    public function settings(): JsonResponse
    {
        $keys = ['site_name', 'tagline', 'support_email', 'default_city'];
        $values = Setting::query()->whereIn('key', $keys)->pluck('value', 'key');

        return ApiResponse::success($values);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'site_name' => ['required', 'string', 'max:80'],
            'tagline' => ['required', 'string', 'max:180'],
            'support_email' => ['required', 'email', 'max:255'],
            'default_city' => ['required', 'string', 'max:80'],
        ]);

        foreach ($data as $key => $value) {
            Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return ApiResponse::success($data, 'Podešavanja su sačuvana.');
    }

    public function promotions(): JsonResponse
    {
        return ApiResponse::success(
            PromotionResource::collection(Promotion::query()->orderBy('sort_order')->get())
        );
    }

    public function storePromotion(Request $request, ImageService $images): JsonResponse
    {
        $data = collect($this->validated($request))->except('image')->all();
        $promotion = Promotion::query()->create($data + [
            'sort_order' => $data['sort_order'] ?? ((int) Promotion::query()->max('sort_order') + 1),
        ]);

        if ($request->file('image')) {
            $meta = $images->store($request->file('image'), 'promotions', 1600, 800, 800, 400);
            $promotion->update(['image_path' => $meta['path']]);
        }

        return ApiResponse::success(new PromotionResource($promotion), 'Promocija je kreirana.', 201);
    }

    public function updatePromotion(Request $request, Promotion $promotion, ImageService $images): JsonResponse
    {
        $promotion->update(collect($this->validated($request, partial: true))->except('image')->all());

        if ($request->file('image')) {
            $meta = $images->store($request->file('image'), 'promotions', 1600, 800, 800, 400);
            $images->delete($promotion->image_path);
            $promotion->update(['image_path' => $meta['path']]);
        }

        return ApiResponse::success(new PromotionResource($promotion->refresh()), 'Promocija je sačuvana.');
    }

    public function destroyPromotion(Promotion $promotion, ImageService $images): JsonResponse
    {
        $images->delete($promotion->image_path);
        $promotion->delete();

        return ApiResponse::success(null, 'Promocija je obrisana.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:180'],
            'link_url' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
    }
}
