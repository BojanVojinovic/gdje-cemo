<?php

namespace App\Enums;

enum VenueStatus: string
{
    case Draft = 'draft';
    case Pending = 'pending';
    case Published = 'published';
    case Suspended = 'suspended';
}
