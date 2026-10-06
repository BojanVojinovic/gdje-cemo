<?php

namespace App\Services;

use App\Mail\VerificationCodeMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class EmailVerificationCodeService
{
    public function issue(User $user): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        EmailVerificationCode::query()->where('user_id', $user->id)->delete();
        EmailVerificationCode::query()->create([
            'user_id' => $user->id,
            'code_hash' => hash('sha256', $code),
            'expires_at' => now()->addMinutes(30),
        ]);

        Mail::to($user->email)->send(new VerificationCodeMail($code, $this->locale($user), $user->email));
    }

    public function confirm(string $email, string $code): User
    {
        $user = User::query()->where('email', $email)->first();
        $row = $user
            ? EmailVerificationCode::query()->where('user_id', $user->id)->latest()->first()
            : null;

        if (! $user || ! $row || $row->expires_at->isPast() || $row->attempts >= 5) {
            throw ValidationException::withMessages(['code' => trans('messages.code_invalid', [], $this->requestLocale())]);
        }

        if (! hash_equals($row->code_hash, hash('sha256', $code))) {
            $row->increment('attempts');
            throw ValidationException::withMessages(['code' => trans('messages.code_invalid', [], $this->locale($user))]);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }
        EmailVerificationCode::query()->where('user_id', $user->id)->delete();

        return $user;
    }

    private function locale(User $user): string
    {
        return $user->locale === 'cnr' ? 'cnr' : 'en';
    }

    private function requestLocale(): string
    {
        return str_starts_with((string) request()->header('Accept-Language'), 'cnr') ? 'cnr' : 'en';
    }
}
