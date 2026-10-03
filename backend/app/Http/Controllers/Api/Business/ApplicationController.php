<?php

namespace App\Http\Controllers\Api\Business;

use App\Enums\BusinessStatus;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Role;
use App\Services\SlugService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplicationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $business = $request->user()->businesses()->latest()->first();

        return ApiResponse::success($business ? [
            'id' => $business->id,
            'name' => $business->name,
            'status' => $business->status?->value,
            'rejection_reason' => $business->rejection_reason,
        ] : null);
    }

    public function store(Request $request, SlugService $slugs): JsonResponse
    {
        $user = $request->user();

        if ($user->isBusiness() || $user->businesses()->where('status', BusinessStatus::Pending->value)->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Zahtjev za biznis nalog je već poslat ili je nalog već odobren.',
            ]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);

        $business = DB::transaction(function () use ($user, $data, $slugs) {
            $business = Business::query()->create([
                'owner_id' => $user->id,
                'name' => $data['name'],
                'slug' => $slugs->unique($data['name'], Business::class),
                'description' => $data['description'] ?? null,
                'phone' => $data['phone'] ?? null,
                'status' => BusinessStatus::Pending,
            ]);

            $business->users()->attach($user->id, ['role' => 'owner']);

            return $business;
        });

        return ApiResponse::success([
            'id' => $business->id,
            'name' => $business->name,
            'status' => $business->status->value,
        ], 'Zahtjev je poslat. Javićemo vam se nakon provjere.', 201);
    }
}
