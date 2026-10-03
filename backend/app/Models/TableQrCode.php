<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TableQrCode extends Model
{
    protected $fillable = ['venue_table_id', 'token', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(VenueTable::class, 'venue_table_id');
    }
}
