<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Set default string length for MySQL compatibility
        Schema::defaultStringLength(191);

        // Force HTTPS in production
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        // Register custom validation rules
        $this->registerCustomValidationRules();
    }

    /**
     * Register custom validation rules
     */
    private function registerCustomValidationRules(): void
    {
        // Custom validation for referral codes
        \Validator::extend('referral_code', function ($attribute, $value, $parameters, $validator) {
            return preg_match('/^[A-Z0-9]{6,10}$/', $value);
        });

        // Custom validation for phone numbers
        \Validator::extend('phone_number', function ($attribute, $value, $parameters, $validator) {
            return preg_match('/^[\+]?[1-9]?[0-9]{7,15}$/', $value);
        });

        // Custom validation for strong passwords
        \Validator::extend('strong_password', function ($attribute, $value, $parameters, $validator) {
            return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/', $value);
        });
    }
}