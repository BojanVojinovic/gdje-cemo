<?php

namespace App\Models;

use App\Enums\ContentStatus;
use App\Enums\ContentType;
use App\Services\ImageService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VenueContent extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'venue_id', 'author_id', 'type', 'title', 'slug', 'body', 'cover_path', 'video_url', 'status', 'priority',
        'scheduled_at', 'published_at', 'expires_at', 'event_start_at', 'event_end_at', 'event_category', 'price',
        'capacity', 'registration_mode', 'organizer', 'blocks_reservations', 'valid_from', 'valid_until',
        'daily_start', 'daily_end', 'days_of_week', 'terms', 'translations',
    ];

    protected function casts(): array
    {
        return [
            'type' => ContentType::class,
            'status' => ContentStatus::class,
            'priority' => 'integer',
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'event_start_at' => 'datetime',
            'event_end_at' => 'datetime',
            'price' => 'float',
            'capacity' => 'integer',
            'blocks_reservations' => 'boolean',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'days_of_week' => 'array',
            'translations' => 'array',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function coverUrl(): ?string
    {
        return ImageService::url($this->cover_path);
    }
}
