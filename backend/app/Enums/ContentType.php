<?php

namespace App\Enums;

enum ContentType: string
{
    case Event = 'event';
    case Post = 'post';
    case Announcement = 'announcement';
    case Promotion = 'promotion';
    case SpecialOffer = 'special_offer';
}
