<?php

namespace App\Enums;

enum ReviewStatus: string
{
    case Published = 'published';
    case Hidden = 'hidden';
}
