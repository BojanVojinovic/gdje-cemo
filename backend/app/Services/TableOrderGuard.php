<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class TableOrderGuard
{
    public function assert(string $actor, int $tableId, string $ip, int $lines, int $totalQty, int $pending): void
    {
        if ($lines > 10 || $totalQty > 24) {
            throw ValidationException::withMessages(['items' => 'Najviše 10 stavki i 24 komada u jednoj narudžbini.']);
        }

        if (Cache::has($this->cool($actor))) {
            throw ValidationException::withMessages(['items' => 'Sačekajte malo prije sljedeće narudžbine.']);
        }

        if ((int) Cache::get($this->window($actor), 0) >= 8) {
            throw ValidationException::withMessages(['items' => 'Previše narudžbina u kratkom roku.']);
        }

        if ((int) Cache::get($this->ip($ip, $tableId), 0) >= 12) {
            throw ValidationException::withMessages(['items' => 'Sa ovog uređaja je stiglo previše narudžbina za ovaj sto.']);
        }

        if ($pending >= 8) {
            throw ValidationException::withMessages(['items' => 'Na ovom stolu već ima neobrađenih narudžbina.']);
        }
    }

    public function remember(string $actor, int $tableId, string $ip): void
    {
        Cache::put($this->cool($actor), 1, now()->addSeconds(20));
        $window = $this->window($actor);
        Cache::put($window, (int) Cache::get($window, 0) + 1, now()->addMinutes(30));
        $ipKey = $this->ip($ip, $tableId);
        Cache::put($ipKey, (int) Cache::get($ipKey, 0) + 1, now()->addMinutes(10));
    }

    private function cool(string $actor): string
    {
        return 'table-order-cool:'.$actor;
    }

    private function window(string $actor): string
    {
        return 'table-order-window:'.$actor;
    }

    private function ip(string $ip, int $tableId): string
    {
        return 'table-order-ip:'.$ip.':'.$tableId;
    }
}
