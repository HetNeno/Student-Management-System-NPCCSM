<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('npccsm:status', function (): void {
    $this->info('NPCCSM Laravel portal is configured.');
})->purpose('Check the NPCCSM Laravel command setup');
