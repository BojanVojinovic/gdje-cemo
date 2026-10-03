<?php

namespace App\Enums;

enum ContentStatus: string
{
    case Draft = 'draft';
    case Scheduled = 'scheduled';
    case Published = 'published';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
    case Archived = 'archived';
    case Hidden = 'hidden';
}
