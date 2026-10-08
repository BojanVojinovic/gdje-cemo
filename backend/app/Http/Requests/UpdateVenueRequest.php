<?php

namespace App\Http\Requests;

use App\Enums\VenueStatus;
use App\Enums\VerificationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVenueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['tagline', 'brand_color'] as $field) {
            if ($this->exists($field) && $this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }

        if ($this->filled('brand_color')) {
            $this->merge(['brand_color' => strtolower((string) $this->input('brand_color'))]);
        }
    }

    public function rules(): array
    {
        return [
            'business_id' => ['sometimes', 'integer', 'exists:businesses,id'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'subcategory_id' => ['nullable', 'integer', 'exists:categories,id'],
            'name' => ['sometimes', 'string', 'max:160'],
            'description' => ['sometimes', 'string', 'max:5000'],
            'address' => ['sometimes', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:120'],
            'country' => ['sometimes', 'string', 'max:120'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'instagram' => ['nullable', 'url', 'max:255'],
            'facebook' => ['nullable', 'url', 'max:255'],
            'tiktok' => ['nullable', 'url', 'max:255'],
            'price_level' => ['sometimes', 'integer', 'between:1,4'],
            'timezone' => ['nullable', 'timezone'],
            'amenity_ids' => ['sometimes', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
            'status' => ['sometimes', Rule::enum(VenueStatus::class)],
            'verification_status' => ['sometimes', Rule::enum(VerificationStatus::class)],
            'is_featured' => ['sometimes', 'boolean'],
            'offers_delivery' => ['sometimes', 'boolean'],
            'delivery_eta_minutes' => ['required_if:offers_delivery,true,1', 'nullable', 'integer', 'min:5', 'max:180'],
            'tagline' => ['sometimes', 'nullable', 'string', 'max:160'],
            'brand_color' => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'translations' => ['sometimes', 'nullable', 'array'],
            'translations.*.description' => ['nullable', 'string', 'max:5000'],
            'translations.*.tagline' => ['nullable', 'string', 'max:160'],
            'featured_until' => ['nullable', 'date'],
        ];
    }
}
