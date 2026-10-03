<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Seated = 'seated';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';
    case Rejected = 'rejected';
    case Expired = 'expired';

    public function blocksTable(): bool
    {
        return in_array($this, [self::Pending, self::Confirmed, self::Seated], true);
    }
}
