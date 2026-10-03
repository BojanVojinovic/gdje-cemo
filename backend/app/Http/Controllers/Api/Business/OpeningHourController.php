<?php

namespace App\Http\Controllers\Api\Business;

use App\Http\Controllers\Controller;
use App\Http\Requests\SyncOpeningHoursRequest;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Services\OpeningHoursService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class OpeningHourController extends Controller
{
    public function update(SyncOpeningHoursRequest $request, Venue $venue, OpeningHoursService $hours): JsonResponse
    {
        DB::transaction(fn () => $hours->replace($venue, $request->validated('intervals')));
        $venue->load(['category', 'subcategory', 'openingHours']);

        return ApiResponse::success(new VenueResource($venue), 'Radno vrijeme je sačuvano.');
    }
}
