<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SyncOpeningHoursRequest extends FormRequest
{
    public function authorize(): bool
    {
        $venue = $this->route('venue');

        return $venue && ($this->user()?->can('update', $venue) ?? false);
    }

    public function rules(): array
    {
        return [
            'intervals' => ['present', 'array'],
            'intervals.*.day_of_week' => ['required', 'integer', 'between:1,7'],
            'intervals.*.opens_at' => ['required', 'date_format:H:i'],
            'intervals.*.closes_at' => ['required', 'date_format:H:i'],
        ];
    }
}
