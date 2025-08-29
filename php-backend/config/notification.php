<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Push Notifications
    |--------------------------------------------------------------------------
    |
    | Configuration for push notifications using Firebase Cloud Messaging (FCM)
    |
    */
    'push_enabled' => env('PUSH_NOTIFICATIONS_ENABLED', true),
    'fcm_server_key' => env('FCM_SERVER_KEY', ''),
    'fcm_sender_id' => env('FCM_SENDER_ID', ''),

    /*
    |--------------------------------------------------------------------------
    | Email Notifications
    |--------------------------------------------------------------------------
    |
    | Configuration for email notifications
    |
    */
    'email_enabled' => env('EMAIL_NOTIFICATIONS_ENABLED', true),
    'from_email' => env('MAIL_FROM_ADDRESS', 'noreply@example.com'),
    'from_name' => env('MAIL_FROM_NAME', 'Your App Name'),

    /*
    |--------------------------------------------------------------------------
    | Notification Types
    |--------------------------------------------------------------------------
    |
    | Define which notification types should trigger email notifications
    |
    */
    'email_notification_types' => [
        'payment_success',
        'payment_failed',
        'order_status',
        'service_completed',
        'welcome',
        'password_reset',
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification Cleanup
    |--------------------------------------------------------------------------
    |
    | Configuration for automatic cleanup of old notifications
    |
    */
    'cleanup_enabled' => env('NOTIFICATION_CLEANUP_ENABLED', true),
    'cleanup_days' => env('NOTIFICATION_CLEANUP_DAYS', 30),

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Configuration for notification rate limiting to prevent spam
    |
    */
    'rate_limit' => [
        'enabled' => env('NOTIFICATION_RATE_LIMIT_ENABLED', true),
        'max_per_minute' => env('NOTIFICATION_RATE_LIMIT_PER_MINUTE', 10),
        'max_per_hour' => env('NOTIFICATION_RATE_LIMIT_PER_HOUR', 100),
        'max_per_day' => env('NOTIFICATION_RATE_LIMIT_PER_DAY', 500),
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification Templates
    |--------------------------------------------------------------------------
    |
    | Default templates for different notification types
    |
    */
    'templates' => [
        'payment_success' => [
            'title' => 'Payment Successful',
            'message' => 'Your payment of {amount} {currency} has been processed successfully.',
            'email_template' => 'emails.payment-success',
        ],
        'payment_failed' => [
            'title' => 'Payment Failed',
            'message' => 'Your payment of {amount} {currency} could not be processed. Please try again.',
            'email_template' => 'emails.payment-failed',
        ],
        'order_status' => [
            'title' => 'Order Status Update',
            'message' => 'Your order #{order_id} status has been updated to {status}.',
            'email_template' => 'emails.order-status',
        ],
        'service_completed' => [
            'title' => 'Service Completed',
            'message' => 'Your service request has been completed successfully.',
            'email_template' => 'emails.service-completed',
        ],
        'welcome' => [
            'title' => 'Welcome to Our Platform!',
            'message' => 'Welcome {name}! Thank you for joining our platform.',
            'email_template' => 'emails.welcome',
        ],
        'password_reset' => [
            'title' => 'Password Reset Request',
            'message' => 'You have requested to reset your password. Click the link in your email to proceed.',
            'email_template' => 'emails.password-reset',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Webhook Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for notification webhooks
    |
    */
    'webhooks' => [
        'enabled' => env('NOTIFICATION_WEBHOOKS_ENABLED', false),
        'url' => env('NOTIFICATION_WEBHOOK_URL', ''),
        'secret' => env('NOTIFICATION_WEBHOOK_SECRET', ''),
        'timeout' => env('NOTIFICATION_WEBHOOK_TIMEOUT', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for queued notifications
    |
    */
    'queue' => [
        'enabled' => env('NOTIFICATION_QUEUE_ENABLED', true),
        'connection' => env('NOTIFICATION_QUEUE_CONNECTION', 'default'),
        'queue_name' => env('NOTIFICATION_QUEUE_NAME', 'notifications'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Database Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for notification database storage
    |
    */
    'database' => [
        'table' => 'notifications',
        'soft_deletes' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Channels Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for different notification channels
    |
    */
    'channels' => [
        'database' => [
            'enabled' => true,
        ],
        'email' => [
            'enabled' => env('EMAIL_NOTIFICATIONS_ENABLED', true),
            'queue' => env('EMAIL_NOTIFICATIONS_QUEUE', true),
        ],
        'push' => [
            'enabled' => env('PUSH_NOTIFICATIONS_ENABLED', true),
            'queue' => env('PUSH_NOTIFICATIONS_QUEUE', true),
        ],
        'sms' => [
            'enabled' => env('SMS_NOTIFICATIONS_ENABLED', false),
            'provider' => env('SMS_PROVIDER', 'twilio'),
            'queue' => env('SMS_NOTIFICATIONS_QUEUE', true),
        ],
    ],
];