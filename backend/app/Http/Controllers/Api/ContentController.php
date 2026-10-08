<?php

namespace App\Http\Controllers\Api;

use App\Enums\ContentStatus;
use App\Enums\ContentType;
use App\Http\Controllers\Controller;
use App\Models\EventRegistration;
use App\Models\Venue;
use App\Models\VenueContent;
use App\Services\AuditService;
use App\Services\ContentService;
use App\Services\ImageService;
use App\Services\SlugService;
use App\Support\ApiResponse;
use App\Support\ContentLocales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ContentController extends Controller
{
    public function events(Request $request, ContentService $content): JsonResponse
    {
        $content->sync();
        $query = VenueContent::query()
            ->with('venue:id,name,slug,city,latitude,longitude')
            ->where('type', ContentType::Event)
            ->where('status', ContentStatus::Published)
            ->whereHas('venue', fn ($venue) => $venue->published()->where('publishing_suspended', false));

        if ($city = $request->query('city')) {
            $query->whereHas('venue', fn ($venue) => $venue->where('city', $city));
        }
        if ($category = $request->query('category')) {
            $query->where('event_category', $category);
        }
        if ($request->query('price') === 'free') {
            $query->where(fn ($inner) => $inner->whereNull('price')->orWhere('price', 0));
        }
        if ($request->query('price') === 'paid') {
            $query->where('price', '>', 0);
        }
        if ($date = $request->query('date')) {
            $query->whereDate('event_start_at', $date);
        }
        if ($venue = $request->query('venue')) {
            $query->whereHas('venue', fn ($inner) => $inner->where('slug', $venue));
        }

        if ($request->boolean('upcoming')) {
            $query->where('event_start_at', '>=', now());
        }

        $sort = (string) $request->query('sort', 'date');
        if ($sort === 'proximity' && $request->filled('latitude') && $request->filled('longitude')) {
            $query->orderByRaw(
                '(select pow(latitude - ?, 2) + pow(longitude - ?, 2) from venues where venues.id = venue_contents.venue_id) asc',
                [(float) $request->query('latitude'), (float) $request->query('longitude')]
            );
        } elseif ($sort === 'date') {
            $query->orderBy('event_start_at');
        } else {
            $query->latest('published_at');
        }

        $rows = $query->paginate(12);

        return ApiResponse::paginated($rows, \App\Http\Resources\VenueContentResource::class);
    }

    public function showEvent(Request $request, string $slug, ContentService $content): JsonResponse
    {
        $content->sync();
        $event = VenueContent::query()->with('venue')->where('slug', $slug)->where('type', ContentType::Event)->firstOrFail();
        if ($event->status !== ContentStatus::Published || $event->venue->publishing_suspended) {
            abort(404);
        }

        $related = VenueContent::query()
            ->where('venue_id', $event->venue_id)
            ->where('type', ContentType::Event)
            ->where('status', ContentStatus::Published)
            ->where('id', '!=', $event->id)
            ->orderBy('event_start_at')
            ->limit(3)
            ->get();

        $registered = $event->registrations()->where('status', 'registered')->count();
        $viewer = $request->user('sanctum');

        return ApiResponse::success([
            'event' => (new \App\Http\Resources\VenueContentResource($event))->resolve(),
            'registered' => $registered,
            'is_registered' => $viewer
                ? $event->registrations()->where('user_id', $viewer->id)->where('status', 'registered')->exists()
                : false,
            'spots_remaining' => $event->capacity ? max(0, $event->capacity - $registered) : null,
            'related' => \App\Http\Resources\VenueContentResource::collection($related)->resolve(),
        ]);
    }

    public function venueFeed(Venue $venue, ContentService $content): JsonResponse
    {
        $this->authorize('view', $venue);
        $content->sync();
        $items = VenueContent::query()
            ->where('venue_id', $venue->id)
            ->where('status', ContentStatus::Published)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->latest('published_at')
            ->get();

        return ApiResponse::success(\App\Http\Resources\VenueContentResource::collection($items)->resolve());
    }

    public function index(Request $request): JsonResponse
    {
        $query = VenueContent::query()->with('venue:id,name,slug')->latest();
        if (! $request->user()->isAdmin()) {
            $ids = $request->user()->businesses()->pluck('businesses.id');
            $query->whereHas('venue', fn ($venue) => $venue->whereIn('business_id', $ids));
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return ApiResponse::paginated($query->paginate(20), \App\Http\Resources\VenueContentResource::class);
    }

    public function calendar(Request $request): JsonResponse
    {
        $month = $request->query('month', now()->format('Y-m'));
        $start = \Carbon\Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $query = VenueContent::query()->with('venue:id,name')->where(function ($inner) use ($start, $end) {
            $inner->whereBetween('event_start_at', [$start, $end])
                ->orWhereBetween('scheduled_at', [$start, $end])
                ->orWhereBetween('published_at', [$start, $end])
                ->orWhereBetween('valid_from', [$start, $end]);
        });
        if (! $request->user()->isAdmin()) {
            $ids = $request->user()->businesses()->pluck('businesses.id');
            $query->whereHas('venue', fn ($venue) => $venue->whereIn('business_id', $ids));
        }

        return ApiResponse::success(\App\Http\Resources\VenueContentResource::collection($query->get())->resolve());
    }

    public function store(Request $request, SlugService $slugs, ImageService $images, ContentService $service, AuditService $audit): JsonResponse
    {
        $data = $this->withCopy($this->validated($request));
        $venue = Venue::query()->findOrFail($data['venue_id']);
        $this->authorize('update', $venue);
        if ($venue->publishing_suspended && ($data['status'] ?? 'draft') !== 'draft') {
            abort(403, 'Objavljivanje za ovo mjesto je privremeno obustavljeno.');
        }
        $content = VenueContent::query()->create([
            ...$data,
            'author_id' => $request->user()->id,
            'slug' => $slugs->unique($data['title'], VenueContent::class),
            'published_at' => ($data['status'] ?? null) === ContentStatus::Published->value ? now() : null,
        ]);
        $this->cover($request, $content, $images);
        if ($content->status === ContentStatus::Published) {
            $service->announce($content);
        }
        $audit->record($request->user(), 'content.created', $content);

        return ApiResponse::success(new \App\Http\Resources\VenueContentResource($content->refresh()), 'Sadržaj je sačuvan.', 201);
    }

    public function update(Request $request, VenueContent $content, SlugService $slugs, ImageService $images, ContentService $service, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $content->venue);
        $data = $this->withCopy($this->validated($request, partial: true), $content->translations);
        if (isset($data['title'])) {
            $data['slug'] = $slugs->unique($data['title'], VenueContent::class, $content->id);
        }
        $wasPublished = $content->status === ContentStatus::Published;
        $content->update($data);
        $this->cover($request, $content, $images);
        if (! $wasPublished && $content->status === ContentStatus::Published) {
            if (! $content->published_at) {
                $content->update(['published_at' => now()]);
            }
            $service->announce($content);
        } elseif ($wasPublished && $content->status === ContentStatus::Cancelled) {
            $service->notify($content, 'EVENT_CANCELLED');
        } elseif ($wasPublished && $content->status === ContentStatus::Published && $content->type === ContentType::Event) {
            $service->notify($content, 'EVENT_UPDATED');
        }
        $audit->record($request->user(), 'content.updated', $content);

        return ApiResponse::success(new \App\Http\Resources\VenueContentResource($content->refresh()), 'Sadržaj je sačuvan.');
    }

    public function publish(Request $request, VenueContent $content, ContentService $service): JsonResponse
    {
        $this->authorize('update', $content->venue);

        return ApiResponse::success(new \App\Http\Resources\VenueContentResource($service->publish($request->user(), $content)), 'Sadržaj je objavljen.');
    }

    public function duplicate(Request $request, VenueContent $content, SlugService $slugs, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $content->venue);
        $copy = $content->replicate(['slug']);
        $copy->title = $content->title.' (kopija)';
        $copy->slug = $slugs->unique($copy->title, VenueContent::class);
        $copy->status = ContentStatus::Draft;
        $copy->published_at = null;
        $copy->scheduled_at = null;
        $copy->author_id = $request->user()->id;
        $copy->save();
        $audit->record($request->user(), 'content.duplicated', $copy, ['source_id' => $content->id]);

        return ApiResponse::success(new \App\Http\Resources\VenueContentResource($copy), 'Kopija je sačuvana kao nacrt.', 201);
    }

    public function destroy(Request $request, VenueContent $content, AuditService $audit): JsonResponse
    {
        $this->authorize('update', $content->venue);
        $audit->record($request->user(), 'content.deleted', $content, ['title' => $content->title]);
        $content->delete();

        return ApiResponse::success(null, 'Sadržaj je obrisan.');
    }

    public function register(Request $request, VenueContent $content): JsonResponse
    {
        if ($content->type !== ContentType::Event || $content->status !== ContentStatus::Published || $content->registration_mode === 'none') {
            throw ValidationException::withMessages(['event' => 'Prijava na ovaj događaj nije otvorena.']);
        }
        $count = $content->registrations()->where('status', 'registered')->count();
        if ($content->capacity && $count >= $content->capacity) {
            throw ValidationException::withMessages(['event' => 'Nema više slobodnih mjesta.']);
        }
        $registration = EventRegistration::query()->updateOrCreate(
            ['venue_content_id' => $content->id, 'user_id' => $request->user()->id],
            ['status' => 'registered']
        );

        return ApiResponse::success($registration, 'Prijava je sačuvana.');
    }

    public function unregister(Request $request, VenueContent $content): JsonResponse
    {
        EventRegistration::query()
            ->where('venue_content_id', $content->id)
            ->where('user_id', $request->user()->id)
            ->update(['status' => 'cancelled']);

        return ApiResponse::success(null, 'Prijava je otkazana.');
    }

    public function moderate(Request $request, VenueContent $content, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['hidden', 'published', 'archived', 'cancelled'])],
            'publishing_suspended' => ['sometimes', 'boolean'],
        ]);
        $content->update(['status' => $data['status']]);
        if (array_key_exists('publishing_suspended', $data)) {
            $content->venue->update(['publishing_suspended' => $data['publishing_suspended']]);
        }
        $audit->record($request->user(), 'content.moderated', $content, $data);

        return ApiResponse::success(new \App\Http\Resources\VenueContentResource($content->refresh()), 'Sadržaj je moderiran.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'venue_id' => [$partial ? 'sometimes' : 'required', 'integer', 'exists:venues,id'],
            'type' => [$required, Rule::enum(ContentType::class)],
            'title' => [$required, 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:8000'],
            'video_url' => ['nullable', 'url', 'max:255'],
            'status' => ['sometimes', Rule::enum(ContentStatus::class)],
            'priority' => ['sometimes', 'integer', 'min:0', 'max:5'],
            'scheduled_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'event_start_at' => ['nullable', 'date'],
            'event_end_at' => ['nullable', 'date', 'after:event_start_at'],
            'event_category' => ['nullable', 'string', 'max:80'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'registration_mode' => ['sometimes', 'in:none,registration,table_reservation,capacity'],
            'organizer' => ['nullable', 'string', 'max:120'],
            'blocks_reservations' => ['sometimes', 'boolean'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'daily_start' => ['nullable', 'date_format:H:i'],
            'daily_end' => ['nullable', 'date_format:H:i'],
            'days_of_week' => ['nullable', 'array'],
            'days_of_week.*' => ['integer', 'between:1,7'],
            'terms' => ['nullable', 'string', 'max:2000'],
            'translations' => ['sometimes', 'array'],
            'translations.*.title' => ['nullable', 'string', 'max:160'],
            'translations.*.body' => ['nullable', 'string', 'max:8000'],
            'translations.*.terms' => ['nullable', 'string', 'max:2000'],
            'translations.*.event_category' => ['nullable', 'string', 'max:80'],
        ]);
    }

    private function withCopy(array $data, ?array $existing = null): array
    {
        if (! array_key_exists('translations', $data)) {
            return $data;
        }

        $merged = ContentLocales::merge($existing, $data['translations'], ['title', 'body', 'terms', 'event_category']);
        $data['translations'] = $merged === [] ? null : $merged;

        return $data;
    }

    private function cover(Request $request, VenueContent $content, ImageService $images): void
    {
        if (! $request->file('cover')) {
            return;
        }
        $request->validate(['cover' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $meta = $images->store($request->file('cover'), 'content/'.$content->venue_id, 1600, 800, 600, 400);
        $images->delete($content->cover_path);
        $content->update(['cover_path' => $meta['path']]);
    }
}
