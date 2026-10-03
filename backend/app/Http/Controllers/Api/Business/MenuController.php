<?php

namespace App\Http\Controllers\Api\Business;

use App\Http\Controllers\Controller;
use App\Http\Resources\MenuCategoryResource;
use App\Http\Resources\MenuItemResource;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Venue;
use App\Services\ImageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Policies\MenuPolicy;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MenuController extends Controller
{
    public function storeCategory(Request $request, Venue $venue): JsonResponse
    {
        $this->allow('manageVenue', $venue);
        $data = $request->validate(['name' => ['required', 'string', 'max:120']]);

        $menu = $venue->menus()->firstOrCreate(['name' => 'Meni'], ['is_active' => true]);
        $category = $menu->categories()->create([
            'name' => $data['name'],
            'sort_order' => (int) $menu->categories()->max('sort_order') + 1,
        ]);

        return ApiResponse::success(new MenuCategoryResource($category->load('items')), 'Kategorija menija je dodata.', 201);
    }

    public function updateCategory(Request $request, MenuCategory $menuCategory): JsonResponse
    {
        $this->allow('manageCategory', $menuCategory);
        $data = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $menuCategory->update($data);

        return ApiResponse::success(new MenuCategoryResource($menuCategory->load('items')), 'Kategorija je sačuvana.');
    }

    public function destroyCategory(MenuCategory $menuCategory): JsonResponse
    {
        $this->allow('manageCategory', $menuCategory);
        $menuCategory->delete();

        return ApiResponse::success(null, 'Kategorija menija je obrisana.');
    }

    public function reorderCategories(Request $request, Venue $venue): JsonResponse
    {
        $this->allow('manageVenue', $venue);
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $menu = $venue->menus()->first();
        $owned = $menu ? $menu->categories()->whereIn('id', $data['ids'])->pluck('id') : collect();

        if ($owned->count() !== count($data['ids'])) {
            throw ValidationException::withMessages(['ids' => 'Redoslijed sadrži kategoriju koja ne pripada ovom meniju.']);
        }

        foreach ($data['ids'] as $index => $id) {
            MenuCategory::query()->where('id', $id)->update(['sort_order' => $index]);
        }

        return ApiResponse::success(null, 'Redoslijed kategorija je sačuvan.');
    }

    public function storeItem(Request $request, MenuCategory $menuCategory): JsonResponse
    {
        $this->allow('manageCategory', $menuCategory);
        $data = $this->itemData($request);
        $item = $menuCategory->items()->create([
            ...$data,
            'sort_order' => (int) $menuCategory->items()->max('sort_order') + 1,
        ]);

        return ApiResponse::success(new MenuItemResource($item), 'Stavka je dodata.', 201);
    }

    public function updateItem(Request $request, MenuItem $menuItem): JsonResponse
    {
        $this->allow('manageItem', $menuItem);
        $menuItem->update($this->itemData($request, partial: true));

        return ApiResponse::success(new MenuItemResource($menuItem->refresh()), 'Stavka je sačuvana.');
    }

    public function destroyItem(MenuItem $menuItem, ImageService $images): JsonResponse
    {
        $this->allow('manageItem', $menuItem);
        $images->delete($menuItem->image_path);
        $menuItem->delete();

        return ApiResponse::success(null, 'Stavka je obrisana.');
    }

    public function updateItemImage(Request $request, MenuItem $menuItem, ImageService $images): JsonResponse
    {
        $this->allow('manageItem', $menuItem);
        $request->validate(['image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $meta = $images->store($request->file('image'), 'menu-items/'.$menuItem->id, 1200, 480, 400, 300);
        $images->delete($menuItem->image_path);
        $menuItem->update(['image_path' => $meta['path']]);

        return ApiResponse::success(new MenuItemResource($menuItem), 'Fotografija stavke je sačuvana.');
    }

    public function reorderItems(Request $request, MenuCategory $menuCategory): JsonResponse
    {
        $this->allow('manageCategory', $menuCategory);
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $owned = $menuCategory->items()->whereIn('id', $data['ids'])->pluck('id');

        if ($owned->count() !== count($data['ids'])) {
            throw ValidationException::withMessages(['ids' => 'Redoslijed sadrži stavku koja ne pripada ovoj kategoriji.']);
        }

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $index => $id) {
                MenuItem::query()->where('id', $id)->update(['sort_order' => $index]);
            }
        });

        return ApiResponse::success(null, 'Redoslijed stavki je sačuvan.');
    }

    private function allow(string $ability, mixed $argument): void
    {
        $allowed = app(MenuPolicy::class)->{$ability}(request()->user(), $argument);

        if (! $allowed) {
            abort(403, 'Nemate dozvolu za ovu radnju.');
        }
    }

    private function itemData(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => [$required, 'numeric', 'min:0', 'max:9999'],
            'is_available' => ['sometimes', 'boolean'],
        ]);
    }
}
