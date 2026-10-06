<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\UserResource;
use App\Services\ImageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success(
            new UserResource($request->user()->load('role', 'businesses', 'staffAssignments.venue'))
        );
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $emailChanged = $request->string('email')->value() !== $user->email;

        $user->fill($request->validated());

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        return ApiResponse::success(
            new UserResource($user->load('role', 'businesses', 'staffAssignments.venue')),
            $emailChanged ? 'Profil je sačuvan. Potvrdite novu email adresu.' : 'Profil je sačuvan.'
        );
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->password = $request->string('password')->value();
        $user->save();

        $currentId = $user->currentAccessToken()?->id;
        $user->tokens()->when($currentId, fn ($query) => $query->where('id', '!=', $currentId))->delete();

        return ApiResponse::success(null, 'Lozinka je promijenjena.');
    }

    public function updateAvatar(Request $request, ImageService $images): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();
        $stored = $images->store($request->file('image'), 'avatars/'.$user->id, 800, 256, 200, 200);
        $images->delete($user->avatar_path);
        $user->update(['avatar_path' => $stored['path']]);

        return ApiResponse::success(new UserResource($user->load('role', 'businesses', 'staffAssignments.venue')), 'Fotografija profila je sačuvana.');
    }

    public function deleteAvatar(Request $request, ImageService $images): JsonResponse
    {
        $user = $request->user();
        $images->delete($user->avatar_path);
        $user->update(['avatar_path' => null]);

        return ApiResponse::success(new UserResource($user->load('role', 'businesses', 'staffAssignments.venue')), 'Fotografija profila je uklonjena.');
    }

    public function reviews(Request $request): JsonResponse
    {
        $reviews = $request->user()
            ->reviews()
            ->with(['venue:id,name,slug,city', 'response.user'])
            ->latest()
            ->paginate(min(50, max(1, (int) $request->integer('per_page', 10))));

        return ApiResponse::paginated($reviews, ReviewResource::class);
    }

    public function activity(Request $request): JsonResponse
    {
        $user = $request->user();

        return ApiResponse::success([
            'reviews_count' => $user->reviews()->count(),
            'favorites_count' => $user->favorites()->count(),
            'member_since' => $user->created_at?->toIso8601String(),
        ]);
    }
}
