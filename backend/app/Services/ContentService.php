<?php

namespace App\Services;

use App\Enums\ContentStatus;
use App\Enums\ContentType;
use App\Models\User;
use App\Models\VenueContent;

class ContentService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly AuditService $audit,
    ) {}

    public function sync(): int
    {
        $published = 0;

        VenueContent::query()
            ->where('status', ContentStatus::Scheduled)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->with('venue')
            ->each(function (VenueContent $content) use (&$published) {
                $content->update([
                    'status' => ContentStatus::Published,
                    'published_at' => now(),
                ]);
                $this->announce($content);
                $published++;
            });

        VenueContent::query()
            ->where('status', ContentStatus::Published)
            ->where(function ($query) {
                $query->where(fn ($inner) => $inner->whereNotNull('expires_at')->where('expires_at', '<=', now()))
                    ->orWhere(fn ($inner) => $inner->where('type', ContentType::Event)->whereNotNull('event_end_at')->where('event_end_at', '<=', now()));
            })
            ->update(['status' => ContentStatus::Completed]);

        return $published;
    }

    public function publish(User $actor, VenueContent $content): VenueContent
    {
        if ($content->venue->publishing_suspended && ! $actor->isAdmin()) {
            abort(403, 'Objavljivanje za ovo mjesto je privremeno obustavljeno.');
        }

        $content->update([
            'status' => ContentStatus::Published,
            'published_at' => now(),
            'scheduled_at' => null,
        ]);
        $this->announce($content);
        $this->audit->record($actor, 'content.published', $content);

        return $content->refresh();
    }

    public function announce(VenueContent $content): void
    {
        $content->loadMissing('venue');
        $type = match ($content->type) {
            ContentType::Event => 'NEW_EVENT',
            ContentType::Promotion, ContentType::SpecialOffer => 'NEW_PROMOTION',
            ContentType::Announcement => 'VENUE_ANNOUNCEMENT',
            default => 'NEW_POST',
        };

        $this->notify($content, $type);
    }

    public function notify(VenueContent $content, string $type): void
    {
        $content->loadMissing('venue');
        $this->notifications->notifyFollowers(
            $content->venue,
            $type,
            $content->title,
            $content->venue->name,
            ['slug' => $content->slug, 'content_id' => $content->id]
        );
    }
}
