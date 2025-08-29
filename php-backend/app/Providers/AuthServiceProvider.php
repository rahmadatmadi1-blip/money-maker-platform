<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        //
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Define Gates for role-based access control
        Gate::define('admin-access', function (User $user) {
            return $user->role === 'admin';
        });

        Gate::define('premium-access', function (User $user) {
            return $user->is_premium || $user->role === 'admin';
        });

        Gate::define('affiliate-access', function (User $user) {
            return in_array($user->role, ['affiliate', 'admin']) || $user->is_premium;
        });

        Gate::define('vendor-access', function (User $user) {
            return in_array($user->role, ['vendor', 'admin']);
        });

        Gate::define('manage-users', function (User $user) {
            return $user->role === 'admin';
        });

        Gate::define('view-analytics', function (User $user) {
            return in_array($user->role, ['admin', 'vendor', 'affiliate']) || $user->is_premium;
        });

        Gate::define('manage-content', function (User $user) {
            return in_array($user->role, ['admin', 'vendor']);
        });

        Gate::define('process-payments', function (User $user) {
            return in_array($user->role, ['admin', 'vendor']);
        });

        Gate::define('access-marketplace', function (User $user) {
            return $user->is_verified && ($user->is_premium || in_array($user->role, ['vendor', 'affiliate', 'admin']));
        });

        Gate::define('withdraw-earnings', function (User $user) {
            return $user->is_verified && $user->available_balance > 0 && in_array($user->role, ['affiliate', 'vendor', 'admin']);
        });
    }
}