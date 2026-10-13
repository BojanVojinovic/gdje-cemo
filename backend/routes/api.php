<?php

use App\Http\Controllers\Api\Admin\AdminController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\Admin\PlatformController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Business\ApplicationController;
use App\Http\Controllers\Api\Business\MenuController;
use App\Http\Controllers\Api\Business\OpeningHourController;
use App\Http\Controllers\Api\Business\StaffController as BusinessStaffController;
use App\Http\Controllers\Api\Business\SubscriptionController;
use App\Http\Controllers\Api\Business\VenueController as BusinessVenueController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\DiningController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\FloorPlanController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\LoungerController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\VenueController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::get('health', fn () => ApiResponse::success(['status' => 'ok']));

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth');
    Route::post('email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:auth');
    Route::post('email/verify-code', [AuthController::class, 'verifyCode'])->middleware('throttle:auth');
    Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')
        ->name('verification.verify');
});

Route::get('categories', [CatalogController::class, 'categories']);
Route::get('amenities', [CatalogController::class, 'amenities']);
Route::get('cities', [CatalogController::class, 'cities']);
Route::get('home', [CatalogController::class, 'home']);
Route::get('venues', [VenueController::class, 'index']);
Route::get('venues/{slug}', [VenueController::class, 'show'])->where('slug', '[A-Za-z0-9\-]+');
Route::get('venues/{venue}/reviews', [VenueController::class, 'reviews'])->whereNumber('venue');
Route::get('venues/{venue}/menu', [VenueController::class, 'menu'])->whereNumber('venue');
Route::get('venues/{venue}/floor-plan', [FloorPlanController::class, 'show'])->whereNumber('venue');
Route::get('venues/{venue}/loungers', [LoungerController::class, 'show'])->whereNumber('venue');
Route::post('venues/{venue}/lounger-rentals', [LoungerController::class, 'guestRental'])->whereNumber('venue')->middleware('throttle:30,1');
Route::get('venues/{venue}/availability', [ReservationController::class, 'availability'])->whereNumber('venue');
Route::get('venues/{venue}/content', [ContentController::class, 'venueFeed'])->whereNumber('venue');
Route::get('events', [ContentController::class, 'events']);
Route::get('events/{slug}', [ContentController::class, 'showEvent'])->where('slug', '[A-Za-z0-9\-]+');
Route::get('tables/qr/{token}', [DiningController::class, 'scan']);
Route::post('tables/qr/{token}/session', [DiningController::class, 'openSession'])->middleware('throttle:table-session');
Route::post('sessions/{session}/orders', [DiningController::class, 'order']);
Route::post('sessions/{session}/service', [DiningController::class, 'service']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::get('me', [ProfileController::class, 'show']);
    Route::put('me', [ProfileController::class, 'update']);
    Route::put('me/locale', [ProfileController::class, 'updateLocale']);
    Route::put('me/password', [ProfileController::class, 'updatePassword']);
    Route::post('me/avatar', [ProfileController::class, 'updateAvatar']);
    Route::delete('me/avatar', [ProfileController::class, 'deleteAvatar']);
    Route::get('me/reviews', [ProfileController::class, 'reviews']);
    Route::get('me/activity', [ProfileController::class, 'activity']);
    Route::get('me/favorites', [FavoriteController::class, 'index']);
    Route::get('me/reservations', [ReservationController::class, 'mine']);
    Route::get('me/notification-preferences', [FollowController::class, 'preferences']);
    Route::put('me/notification-preferences', [FollowController::class, 'updatePreferences']);
    Route::get('me/notifications', [FollowController::class, 'notifications']);
    Route::post('me/notifications/{notification}/read', [FollowController::class, 'read']);
    Route::get('me/shifts', [ShiftController::class, 'mine']);
    Route::post('me/shifts/{staffShift}/swaps', [ShiftController::class, 'requestSwap']);
    Route::post('me/shift-swaps/{shiftSwap}/accept', [ShiftController::class, 'accept']);
    Route::post('me/shift-swaps/{shiftSwap}/decline', [ShiftController::class, 'decline']);
    Route::post('me/shift-swaps/{shiftSwap}/cancel', [ShiftController::class, 'cancelSwap']);
    Route::get('me/deliveries', [DeliveryController::class, 'mine']);
    Route::get('me/deliveries/{deliveryOrder}', [DeliveryController::class, 'show']);
    Route::post('venues/{venue}/deliveries', [DeliveryController::class, 'store'])->whereNumber('venue');

    Route::post('venues/{venue}/reservations', [ReservationController::class, 'store'])->whereNumber('venue');
    Route::put('staff/lounger-rentals/{rental}', [LoungerController::class, 'transition']);
    Route::post('venues/{venue}/waitlist', [ReservationController::class, 'waitlist'])->whereNumber('venue');
    Route::post('reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
    Route::post('venues/{venue}/follow', [FollowController::class, 'follow'])->whereNumber('venue');
    Route::delete('venues/{venue}/follow', [FollowController::class, 'unfollow'])->whereNumber('venue');
    Route::post('content/{content}/register', [ContentController::class, 'register']);
    Route::delete('content/{content}/register', [ContentController::class, 'unregister']);
    Route::get('staff/board', [StaffController::class, 'board']);
    Route::put('staff/orders/{order}', [StaffController::class, 'updateOrder']);
    Route::put('staff/deliveries/{deliveryOrder}', [DeliveryController::class, 'update']);
    Route::post('staff/requests/{tableServiceRequest}/done', [StaffController::class, 'completeRequest']);

    Route::post('venues/{venue}/reviews', [ReviewController::class, 'store'])->whereNumber('venue');
    Route::put('reviews/{review}', [ReviewController::class, 'update']);
    Route::delete('reviews/{review}', [ReviewController::class, 'destroy']);
    Route::post('reviews/{review}/response', [ReviewController::class, 'respond']);

    Route::post('venues/{venue}/favorite', [FavoriteController::class, 'store'])->whereNumber('venue');
    Route::delete('venues/{venue}/favorite', [FavoriteController::class, 'destroy'])->whereNumber('venue');

    Route::post('reports', [ReportController::class, 'store']);
    Route::get('business/application', [ApplicationController::class, 'show']);
    Route::post('business/apply', [ApplicationController::class, 'store']);

    Route::middleware('role:business,admin')->prefix('business')->group(function () {
        Route::get('plans', [SubscriptionController::class, 'index']);
        Route::post('subscription', [SubscriptionController::class, 'store']);
        Route::post('subscription/cancel', [SubscriptionController::class, 'cancel']);
        Route::get('dashboard', [BusinessVenueController::class, 'dashboard']);
        Route::get('analytics', [AnalyticsController::class, 'business']);
        Route::get('venues/{venue}/shifts', [ShiftController::class, 'forVenue'])->whereNumber('venue');
        Route::post('venues/{venue}/shifts', [ShiftController::class, 'store'])->whereNumber('venue');
        Route::put('shifts/{staffShift}', [ShiftController::class, 'update']);
        Route::delete('shifts/{staffShift}', [ShiftController::class, 'destroy']);
        Route::get('venues/{venue}/deliveries', [DeliveryController::class, 'forVenue'])->whereNumber('venue');
        Route::put('deliveries/{deliveryOrder}', [DeliveryController::class, 'update'])->middleware('plan:delivery');
        Route::get('venues', [BusinessVenueController::class, 'index']);
        Route::post('venues', [BusinessVenueController::class, 'store']);
        Route::get('venues/{venue}', [BusinessVenueController::class, 'show']);
        Route::put('venues/{venue}', [BusinessVenueController::class, 'update']);
        Route::delete('venues/{venue}', [BusinessVenueController::class, 'destroy']);
        Route::post('venues/{venue}/images', [BusinessVenueController::class, 'uploadImages']);
        Route::post('venues/{venue}/cover', [BusinessVenueController::class, 'updateCover']);
        Route::post('venues/{venue}/logo', [BusinessVenueController::class, 'updateLogo']);
        Route::delete('venues/{venue}/logo', [BusinessVenueController::class, 'destroyLogo']);
        Route::delete('venues/{venue}/images/{image}', [BusinessVenueController::class, 'destroyImage']);
        Route::put('venues/{venue}/images/reorder', [BusinessVenueController::class, 'reorderImages']);
        Route::get('venues/{venue}/reviews', [BusinessVenueController::class, 'reviews']);
        Route::put('venues/{venue}/hours', [OpeningHourController::class, 'update']);

        Route::get('venues/{venue}/staff', [BusinessStaffController::class, 'index']);
        Route::post('venues/{venue}/staff', [BusinessStaffController::class, 'store']);
        Route::delete('venues/{venue}/staff/{venueStaff}', [BusinessStaffController::class, 'destroy']);

        Route::post('venues/{venue}/menu/categories', [MenuController::class, 'storeCategory']);
        Route::put('venues/{venue}/menu/categories/reorder', [MenuController::class, 'reorderCategories']);
        Route::put('menu/categories/{menuCategory}', [MenuController::class, 'updateCategory']);
        Route::delete('menu/categories/{menuCategory}', [MenuController::class, 'destroyCategory']);
        Route::post('menu/categories/{menuCategory}/items', [MenuController::class, 'storeItem']);
        Route::put('menu/categories/{menuCategory}/items/reorder', [MenuController::class, 'reorderItems']);
        Route::put('menu/items/{menuItem}', [MenuController::class, 'updateItem']);
        Route::delete('menu/items/{menuItem}', [MenuController::class, 'destroyItem']);
        Route::post('menu/items/{menuItem}/image', [MenuController::class, 'updateItemImage']);

        Route::put('venues/{venue}/loungers', [LoungerController::class, 'enable'])->whereNumber('venue');
        Route::post('venues/{venue}/lounger-zones', [LoungerController::class, 'storeZone'])->whereNumber('venue');
        Route::delete('lounger-zones/{zone}', [LoungerController::class, 'destroyZone']);
        Route::post('venues/{venue}/loungers/items', [LoungerController::class, 'storeLounger'])->whereNumber('venue');
        Route::put('loungers/{lounger}', [LoungerController::class, 'updateLounger']);
        Route::delete('loungers/{lounger}', [LoungerController::class, 'destroyLounger']);
        Route::put('venues/{venue}/loungers/layout', [LoungerController::class, 'layout'])->whereNumber('venue');
        Route::post('loungers/{lounger}/qr', [LoungerController::class, 'regenerateQr']);
        Route::get('venues/{venue}/lounger-rentals', [LoungerController::class, 'rentals'])->whereNumber('venue');
        Route::post('venues/{venue}/lounger-rentals', [LoungerController::class, 'storeRental'])->whereNumber('venue');
        Route::post('lounger-rentals/{rental}/status', [LoungerController::class, 'transition']);

        Route::post('venues/{venue}/floor-plan', [FloorPlanController::class, 'updatePlan'])->whereNumber('venue')->middleware('plan:floor');
        Route::post('venues/{venue}/zones', [FloorPlanController::class, 'storeZone'])->whereNumber('venue')->middleware('plan:floor');
        Route::put('zones/{zone}', [FloorPlanController::class, 'updateZone'])->middleware('plan:floor');
        Route::delete('zones/{zone}', [FloorPlanController::class, 'destroyZone'])->middleware('plan:floor');
        Route::post('venues/{venue}/tables', [FloorPlanController::class, 'storeTable'])->whereNumber('venue')->middleware('plan:floor');
        Route::put('tables/{table}', [FloorPlanController::class, 'updateTable'])->middleware('plan:floor');
        Route::post('tables/{table}/duplicate', [FloorPlanController::class, 'duplicateTable'])->middleware('plan:floor');
        Route::delete('tables/{table}', [FloorPlanController::class, 'destroyTable'])->middleware('plan:floor');
        Route::put('venues/{venue}/tables/layout', [FloorPlanController::class, 'layout'])->whereNumber('venue')->middleware('plan:floor');
        Route::post('tables/{table}/qr', [FloorPlanController::class, 'regenerateQr'])->middleware('plan:floor');
        Route::post('venues/{venue}/table-combinations', [FloorPlanController::class, 'storeCombination'])->whereNumber('venue')->middleware('plan:floor');
        Route::put('venues/{venue}/reservation-settings', [FloorPlanController::class, 'updateSettings'])->whereNumber('venue')->middleware('plan:floor');
        Route::post('venues/{venue}/closures', [FloorPlanController::class, 'storeClosure'])->whereNumber('venue')->middleware('plan:floor');
        Route::delete('closures/{venueClosure}', [FloorPlanController::class, 'destroyClosure'])->middleware('plan:floor');

        Route::get('reservations', [ReservationController::class, 'index']);
        Route::post('reservations/{reservation}/status', [ReservationController::class, 'transition']);
        Route::post('venues/{venue}/walk-ins', [ReservationController::class, 'walkIn'])->whereNumber('venue');

        Route::get('content', [ContentController::class, 'index']);
        Route::get('content-calendar', [ContentController::class, 'calendar']);
        Route::post('content', [ContentController::class, 'store']);
        Route::put('content/{content}', [ContentController::class, 'update'])->middleware('plan:content');
        Route::post('content/{content}/publish', [ContentController::class, 'publish'])->middleware('plan:content');
        Route::post('content/{content}/duplicate', [ContentController::class, 'duplicate'])->middleware('plan:content');
        Route::delete('content/{content}', [ContentController::class, 'destroy'])->middleware('plan:content');

        Route::get('sessions', [DiningController::class, 'sessions']);
        Route::post('sessions/{session}/close', [DiningController::class, 'closeSession'])->middleware('plan:floor');
        Route::put('orders/{order}', [DiningController::class, 'updateOrder'])->middleware('plan:floor');
    });

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('stats', [AdminController::class, 'stats']);
        Route::get('analytics', [AnalyticsController::class, 'admin']);
        Route::get('users', [AdminController::class, 'users']);
        Route::put('users/{user}', [AdminController::class, 'updateUser']);
        Route::delete('users/{user}', [AdminController::class, 'destroyUser']);
        Route::post('users/bulk', [AdminController::class, 'bulkUsers']);

        Route::get('businesses', [AdminController::class, 'businesses']);
        Route::post('businesses/{business}/approve', [AdminController::class, 'approveBusiness']);
        Route::post('businesses/{business}/reject', [AdminController::class, 'rejectBusiness']);

        Route::get('venues', [AdminController::class, 'venues']);
        Route::put('venues/{venue}', [AdminController::class, 'updateVenueStatus']);
        Route::delete('venues/{venue}', [AdminController::class, 'destroyVenue']);
        Route::post('venues/bulk', [AdminController::class, 'bulkVenues']);

        Route::post('categories', [AdminController::class, 'storeCategory']);
        Route::put('categories/{category}', [AdminController::class, 'updateCategory']);
        Route::delete('categories/{category}', [AdminController::class, 'destroyCategory']);

        Route::get('reviews', [AdminController::class, 'reviews']);
        Route::put('reviews/{review}', [AdminController::class, 'updateReview']);
        Route::delete('reviews/{review}', [AdminController::class, 'destroyReview']);
        Route::post('reviews/bulk', [AdminController::class, 'bulkReviews']);

        Route::get('reports', [AdminController::class, 'reports']);
        Route::put('reports/{report}', [AdminController::class, 'updateReport']);

        Route::get('settings', [PlatformController::class, 'settings']);
        Route::put('settings', [PlatformController::class, 'updateSettings']);
        Route::get('promotions', [PlatformController::class, 'promotions']);
        Route::post('promotions', [PlatformController::class, 'storePromotion']);
        Route::put('promotions/{promotion}', [PlatformController::class, 'updatePromotion']);
        Route::delete('promotions/{promotion}', [PlatformController::class, 'destroyPromotion']);
        Route::get('content', [ContentController::class, 'index']);
        Route::put('content/{content}', [ContentController::class, 'moderate']);
    });
});
