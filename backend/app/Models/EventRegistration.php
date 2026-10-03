<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRegistration extends Model
{
    protected $fillable = ['venue_content_id', 'user_id', 'status'];

    public function content(): BelongsTo
    {
        return $this->belongsTo(VenueContent::class, 'venue_content_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
