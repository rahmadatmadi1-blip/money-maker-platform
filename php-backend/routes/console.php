<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command instance allowing a
| simple approach to interacting with each command's IO methods.
|
*/

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
|
| Here you may define all of your scheduled tasks. Laravel's task scheduler
| allows you to fluently and expressively define your command schedule
| within the application itself.
|
*/

// Schedule affiliate commission calculations
Schedule::command('affiliate:calculate-commissions')
    ->daily()
    ->at('00:30')
    ->description('Calculate daily affiliate commissions');

// Schedule premium membership expiry checks
Schedule::command('premium:check-expiry')
    ->daily()
    ->at('01:00')
    ->description('Check and update expired premium memberships');

// Schedule email notifications
Schedule::command('notifications:send-pending')
    ->everyFiveMinutes()
    ->description('Send pending email notifications');

// Schedule database cleanup
Schedule::command('cleanup:old-tokens')
    ->daily()
    ->at('02:00')
    ->description('Clean up expired tokens and sessions');

// Schedule analytics data aggregation
Schedule::command('analytics:aggregate-daily')
    ->daily()
    ->at('03:00')
    ->description('Aggregate daily analytics data');

// Schedule backup
Schedule::command('backup:run')
    ->daily()
    ->at('04:00')
    ->description('Run daily database backup');