<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('reports.create') || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'reportable_type' => ['required', 'in:review,venue,venue_image,user,venue_content'],
            'reportable_id' => ['required', 'integer'],
            'reason' => ['required', 'in:spam,inappropriate,misleading,harassment,incorrect_information,other'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
