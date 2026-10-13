<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoungerQrCode extends Model
{
    protected $fillable = ['lounger_id', 'token', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function lounger(): BelongsTo
    {
        return $this->belongsTo(Lounger::class);
    }
}
