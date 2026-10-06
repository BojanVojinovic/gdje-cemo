<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\EmailVerificationCodeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, EmailVerificationCodeService $codes): JsonResponse
    {
        $role = Role::query()->where('slug', 'customer')->firstOrFail();
        $locale = str_starts_with((string) $request->header('Accept-Language'), 'cnr') ? 'cnr' : 'en';

        $user = User::query()->create([
            ...$request->safe()->except('password'),
            'role_id' => $role->id,
            'locale' => $locale,
            'password' => $request->string('password')->value(),
        ]);

        $codes->issue($user);

        return ApiResponse::success(
            ['user' => new UserResource($user->load('role'))],
            trans('messages.account_created', [], $locale),
            201,
        );
    }

    public function verifyCode(Request $request, EmailVerificationCodeService $codes): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
        ]);
        $user = $codes->confirm($data['email'], $data['code']);
        $locale = $user->locale === 'cnr' ? 'cnr' : 'en';
        $token = $user->createToken('api')->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => new UserResource($user->load('role', 'businesses', 'staffAssignments.venue')),
        ], trans('messages.code_confirmed', [], $locale));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email')->value())->first();

        if (! $user || ! Hash::check($request->string('password')->value(), $user->password)) {
            throw ValidationException::withMessages([
                'email' => trans('messages.bad_login', [], $this->locale($request)),
            ]);
        }

        if (! $user->is_active) {
            return ApiResponse::error('Nalog je onemogućen.', 403);
        }

        if (! $user->hasVerifiedEmail()) {
            $locale = $user->locale === 'cnr' ? 'cnr' : 'en';

            return ApiResponse::error(trans('messages.login_unverified', [], $locale), 403, [
                'email' => [trans('messages.email_unverified', [], $locale)],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => new UserResource($user->load('role', 'businesses', 'staffAssignments.venue')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
            $token->delete();
        } else {
            $plain = $request->bearerToken();
            if ($plain) {
                $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($plain);
                $accessToken?->delete();
            }
        }

        return ApiResponse::success(null, 'Odjavljeni ste.');
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($request->only('email'));

        return ApiResponse::success(null, 'Ako nalog postoji, poslali smo uputstvo za novu lozinku.');
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return ApiResponse::error('Link za resetovanje lozinke nije ispravan ili je istekao.', 422);
        }

        return ApiResponse::success(null, 'Lozinka je promijenjena. Prijavite se ponovo.');
    }

    public function verifyEmail(Request $request, int $id, string $hash): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $user = User::query()->findOrFail($id);

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return ApiResponse::error('Link za potvrdu nije ispravan.', 403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        if (! $request->expectsJson()) {
            return redirect()->away(rtrim((string) config('app.frontend_url'), '/').'/verify-email?status=success');
        }

        return ApiResponse::success(['verified' => true], 'Email je potvrđen.');
    }

    public function resendVerification(Request $request, EmailVerificationCodeService $codes): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::query()->where('email', $data['email'])->first();
        $locale = $this->locale($request);

        if ($user && ! $user->hasVerifiedEmail()) {
            $codes->issue($user);
        }

        return ApiResponse::success(null, trans('messages.code_resent', [], $locale));
    }

    private function locale(Request $request): string
    {
        return str_starts_with((string) $request->header('Accept-Language'), 'cnr') ? 'cnr' : 'en';
    }
}
