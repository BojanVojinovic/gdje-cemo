<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BusinessStatus;
use App\Enums\ReviewStatus;
use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReportResource;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\VenueResource;
use App\Models\Business;
use App\Models\Category;
use App\Models\Report;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Services\ReviewService;
use App\Services\SlugService;
use App\Services\VenueQueryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function stats(): JsonResponse
    {
        return ApiResponse::success([
            'users' => User::query()->count(),
            'businesses' => Business::query()->count(),
            'pending_businesses' => Business::query()->where('status', BusinessStatus::Pending)->count(),
            'venues' => Venue::query()->count(),
            'published_venues' => Venue::query()->where('status', VenueStatus::Published)->count(),
            'reviews' => Review::query()->count(),
            'pending_reports' => Report::query()->where('status', 'pending')->count(),
            'favorites' => DB::table('favorites')->count(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query()->with('role');

        if ($search = trim((string) $request->query('q', ''))) {
            $like = '%'.$search.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('username', 'like', $like);
            });
        }

        if ($role = $request->query('role')) {
            $query->whereHas('role', fn ($relation) => $relation->where('slug', $role));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $sort = (string) $request->query('sort', 'newest');
        match ($sort) {
            'name' => $query->orderBy('first_name')->orderBy('last_name'),
            'email' => $query->orderBy('email'),
            default => $query->latest(),
        };

        $users = $query->paginate(min(50, max(1, (int) $request->integer('per_page', 15))));

        return ApiResponse::paginated($users, UserResource::class);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:80'],
            'last_name' => ['sometimes', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:40'],
            'role' => ['sometimes', 'in:customer,business,admin'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('role', $data)) {
            if ($user->id === $request->user()->id && $data['role'] !== 'admin') {
                throw ValidationException::withMessages(['role' => 'Ne možete sebi ukloniti administratorsku ulogu.']);
            }

            $data['role_id'] = Role::query()->where('slug', $data['role'])->firstOrFail()->id;
            unset($data['role']);
        }

        if (array_key_exists('is_active', $data) && $user->id === $request->user()->id && ! $data['is_active']) {
            throw ValidationException::withMessages(['is_active' => 'Ne možete onemogućiti sopstveni nalog.']);
        }

        $user->update($data);

        if (array_key_exists('is_active', $data) && ! $user->is_active) {
            $user->tokens()->delete();
        }

        return ApiResponse::success(new UserResource($user->load('role')), 'Korisnik je sačuvan.');
    }

    public function destroyUser(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return ApiResponse::error('Ne možete obrisati sopstveni nalog.', 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return ApiResponse::success(null, 'Korisnik je obrisan.');
    }

    public function bulkUsers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:disable,enable'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $ids = collect($data['ids'])->reject(fn ($id) => (int) $id === $request->user()->id)->all();
        $active = $data['action'] === 'enable';

        User::query()->whereIn('id', $ids)->update(['is_active' => $active]);

        if (! $active) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', (new User)->getMorphClass())
                ->whereIn('tokenable_id', $ids)
                ->delete();
        }

        return ApiResponse::success(null, 'Radnja je izvršena.');
    }

    public function businesses(Request $request): JsonResponse
    {
        $query = Business::query()->with('owner:id,first_name,last_name,email')->withCount('venues');

        if ($search = trim((string) $request->query('q', ''))) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $businesses = $query->latest()->paginate(min(50, max(1, (int) $request->integer('per_page', 15))));

        return response()->json([
            'success' => true,
            'data' => $businesses->getCollection()->map(fn (Business $business) => [
                'id' => $business->id,
                'name' => $business->name,
                'slug' => $business->slug,
                'status' => $business->status?->value,
                'phone' => $business->phone,
                'description' => $business->description,
                'rejection_reason' => $business->rejection_reason,
                'venues_count' => $business->venues_count,
                'owner' => $business->owner ? [
                    'id' => $business->owner->id,
                    'name' => $business->owner->name,
                    'email' => $business->owner->email,
                ] : null,
                'created_at' => $business->created_at?->toIso8601String(),
            ])->values(),
            'message' => null,
            'meta' => [
                'current_page' => $businesses->currentPage(),
                'last_page' => $businesses->lastPage(),
                'per_page' => $businesses->perPage(),
                'total' => $businesses->total(),
            ],
        ]);
    }

    public function approveBusiness(Business $business): JsonResponse
    {
        $businessRole = Role::query()->where('slug', 'business')->firstOrFail();

        DB::transaction(function () use ($business, $businessRole) {
            $business->update([
                'status' => BusinessStatus::Approved,
                'approved_at' => now(),
                'rejection_reason' => null,
            ]);

            $owner = $business->owner;
            if ($owner && ! $owner->isAdmin()) {
                $owner->update(['role_id' => $businessRole->id]);
            }
        });

        return ApiResponse::success(null, 'Biznis je odobren.');
    }

    public function rejectBusiness(Request $request, Business $business): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $business->update([
            'status' => BusinessStatus::Rejected,
            'rejection_reason' => $data['reason'],
        ]);

        return ApiResponse::success(null, 'Zahtjev je odbijen.');
    }

    public function venues(Request $request, VenueQueryService $query): JsonResponse
    {
        $venues = $query->adminList($request)->paginate(min(50, max(1, (int) $request->integer('per_page', 15))));

        return ApiResponse::paginated($venues, VenueResource::class);
    }

    public function updateVenueStatus(Request $request, Venue $venue): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::enum(VenueStatus::class)],
            'verification_status' => ['sometimes', Rule::enum(VerificationStatus::class)],
            'is_featured' => ['sometimes', 'boolean'],
            'featured_until' => ['nullable', 'date'],
        ]);

        $venue->update($data);

        return ApiResponse::success(new VenueResource($venue->load(['category', 'subcategory', 'openingHours'])), 'Mjesto je ažurirano.');
    }

    public function destroyVenue(Venue $venue): JsonResponse
    {
        $venue->delete();

        return ApiResponse::success(null, 'Mjesto je obrisano.');
    }

    public function bulkVenues(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:publish,suspend,feature,unfeature,verify'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $update = match ($data['action']) {
            'publish' => ['status' => VenueStatus::Published->value],
            'suspend' => ['status' => VenueStatus::Suspended->value, 'is_featured' => false],
            'feature' => ['is_featured' => true],
            'unfeature' => ['is_featured' => false, 'featured_until' => null],
            'verify' => ['verification_status' => VerificationStatus::Verified->value],
        };

        Venue::query()->whereIn('id', $data['ids'])->update($update);

        return ApiResponse::success(null, 'Radnja je izvršena.');
    }

    public function storeCategory(Request $request, SlugService $slugs): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'icon' => ['nullable', 'string', 'max:40'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category = Category::query()->create([
            ...$data,
            'slug' => $slugs->unique($data['name'], Category::class),
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return ApiResponse::success($category, 'Kategorija je kreirana.', 201);
    }

    public function updateCategory(Request $request, Category $category, SlugService $slugs): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'icon' => ['nullable', 'string', 'max:40'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (isset($data['parent_id']) && (int) $data['parent_id'] === $category->id) {
            throw ValidationException::withMessages(['parent_id' => 'Kategorija ne može biti sopstveni roditelj.']);
        }

        if (isset($data['name'])) {
            $data['slug'] = $slugs->unique($data['name'], Category::class, $category->id);
        }

        $category->update($data);

        return ApiResponse::success($category->refresh(), 'Kategorija je sačuvana.');
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        $inUse = Venue::query()->where('category_id', $category->id)->orWhere('subcategory_id', $category->id)->exists();
        $hasChildren = $category->children()->exists();

        if ($inUse || $hasChildren) {
            return ApiResponse::error('Kategorija se koristi i ne može biti obrisana.', 422);
        }

        $category->delete();

        return ApiResponse::success(null, 'Kategorija je obrisana.');
    }

    public function reviews(Request $request): JsonResponse
    {
        $query = Review::query()->with(['user', 'venue:id,name,slug,city', 'response.user']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) $request->query('q', ''))) {
            $query->where('body', 'like', '%'.$search.'%');
        }

        $reviews = $query->latest()->paginate(min(50, max(1, (int) $request->integer('per_page', 15))));

        return ApiResponse::paginated($reviews, ReviewResource::class);
    }

    public function updateReview(Request $request, Review $review, ReviewService $reviews): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(ReviewStatus::class)],
        ]);

        $review->update($data);
        $reviews->recalculate($review->venue);

        return ApiResponse::success(new ReviewResource($review->load(['user', 'venue', 'response.user'])), 'Recenzija je moderirana.');
    }

    public function destroyReview(Review $review, ReviewService $reviews): JsonResponse
    {
        $venue = $review->venue;
        $review->delete();
        $reviews->recalculate($venue);

        return ApiResponse::success(null, 'Recenzija je obrisana.');
    }

    public function bulkReviews(Request $request, ReviewService $reviews): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:hide,publish,delete'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $items = Review::query()->whereIn('id', $data['ids'])->get();

        foreach ($items as $review) {
            if ($data['action'] === 'delete') {
                $review->delete();
            } else {
                $review->update([
                    'status' => $data['action'] === 'hide' ? ReviewStatus::Hidden : ReviewStatus::Published,
                ]);
            }

            $reviews->recalculate($review->venue);
        }

        return ApiResponse::success(null, 'Radnja je izvršena.');
    }

    public function reports(Request $request): JsonResponse
    {
        $query = Report::query()->with(['reporter', 'administrator']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $reports = $query->latest()->paginate(min(50, max(1, (int) $request->integer('per_page', 15))));

        return ApiResponse::paginated($reports, ReportResource::class);
    }

    public function updateReport(Request $request, Report $report): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,reviewed,resolved,rejected'],
        ]);

        $report->update([
            'status' => $data['status'],
            'administrator_id' => $request->user()->id,
            'resolved_at' => in_array($data['status'], ['resolved', 'rejected'], true) ? now() : null,
        ]);

        return ApiResponse::success(new ReportResource($report->load(['reporter', 'administrator'])), 'Prijava je ažurirana.');
    }
}
