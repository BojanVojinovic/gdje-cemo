<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportRequest;
use App\Models\Report;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    public function store(StoreReportRequest $request): JsonResponse
    {
        $class = Relation::getMorphedModel($request->string('reportable_type')->value());
        $target = $class::query()->find($request->integer('reportable_id'));

        if (! $target) {
            throw ValidationException::withMessages([
                'reportable_id' => 'Sadržaj koji prijavljujete ne postoji.',
            ]);
        }

        if ($target instanceof User && $target->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'reportable_id' => 'Ne možete prijaviti sopstveni nalog.',
            ]);
        }

        $alreadyPending = Report::query()
            ->where('reporter_id', $request->user()->id)
            ->where('reportable_type', $request->string('reportable_type')->value())
            ->where('reportable_id', $target->id)
            ->where('status', ReportStatus::Pending->value)
            ->exists();

        if ($alreadyPending) {
            throw ValidationException::withMessages([
                'reason' => 'Ovu prijavu ste već poslali i još se razmatra.',
            ]);
        }

        $report = Report::query()->create([
            'reporter_id' => $request->user()->id,
            'reportable_type' => $request->string('reportable_type')->value(),
            'reportable_id' => $target->id,
            'reason' => $request->string('reason')->value(),
            'description' => $request->input('description'),
            'status' => ReportStatus::Pending,
        ]);

        return ApiResponse::success(['id' => $report->id], 'Prijava je poslata.', 201);
    }
}
