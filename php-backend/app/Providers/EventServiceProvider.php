<?php

namespace App\Providers;

use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
        
        // User Events
        'App\Events\UserRegistered' => [
            'App\Listeners\SendWelcomeEmail',
            'App\Listeners\ProcessReferralBonus',
        ],
        
        'App\Events\UserUpgradedToPremium' => [
            'App\Listeners\SendPremiumWelcomeEmail',
            'App\Listeners\UpdateUserPermissions',
        ],
        
        'App\Events\UserEmailVerified' => [
            'App\Listeners\SendEmailVerifiedNotification',
        ],
        
        // Payment Events
        'App\Events\PaymentProcessed' => [
            'App\Listeners\UpdateUserBalance',
            'App\Listeners\SendPaymentConfirmation',
            'App\Listeners\ProcessAffiliateCommission',
        ],
        
        'App\Events\PaymentFailed' => [
            'App\Listeners\SendPaymentFailedNotification',
            'App\Listeners\LogPaymentFailure',
        ],
        
        // Affiliate Events
        'App\Events\ReferralRegistered' => [
            'App\Listeners\ProcessReferralBonus',
            'App\Listeners\SendReferralNotification',
        ],
        
        'App\Events\CommissionEarned' => [
            'App\Listeners\UpdateAffiliateBalance',
            'App\Listeners\SendCommissionNotification',
        ],
        
        // Order Events
        'App\Events\OrderCreated' => [
            'App\Listeners\SendOrderConfirmation',
            'App\Listeners\UpdateInventory',
            'App\Listeners\ProcessVendorCommission',
        ],
        
        'App\Events\OrderCompleted' => [
            'App\Listeners\SendOrderCompletedNotification',
            'App\Listeners\RequestProductReview',
        ],
        
        // System Events
        'App\Events\SystemAlert' => [
            'App\Listeners\SendAdminAlert',
            'App\Listeners\LogSystemEvent',
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}