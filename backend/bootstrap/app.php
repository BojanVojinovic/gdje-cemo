<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureUserIsActive;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureRole::class,
            'active' => EnsureUserIsActive::class,
        ]);

        $middleware->trustProxies(at: '*');
        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            if ($e instanceof ValidationException) {
                return ApiResponse::error('Provjera podataka nije uspjela.', 422, $e->errors());
            }

            if ($e instanceof AuthenticationException) {
                return ApiResponse::error('Morate biti prijavljeni.', 401);
            }

            if ($e instanceof AuthorizationException) {
                return ApiResponse::error('Nemate dozvolu za ovu radnju.', 403);
            }

            if ($e instanceof NotFoundHttpException) {
                return ApiResponse::error('Traženi resurs nije pronađen.', 404);
            }

            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                $message = $e->getMessage();
                $generic = [
                    '',
                    'Forbidden',
                    'This action is unauthorized.',
                    'HTTP exception',
                ];

                if ($status === 403 && (in_array($message, $generic, true) || str_starts_with($message, 'This action'))) {
                    $message = 'Nemate dozvolu za ovu radnju.';
                }

                if ($status === 429) {
                    $message = 'Previše zahtjeva. Pokušajte ponovo za koji trenutak.';
                }

                if ($status >= 500 || $message === '') {
                    report($e);

                    return ApiResponse::error('Došlo je do greške. Pokušajte ponovo.', $status >= 500 ? 500 : $status);
                }

                return ApiResponse::error($message, $status);
            }

            report($e);

            return ApiResponse::error('Došlo je do greške. Pokušajte ponovo.', 500);
        });
    })->create();
