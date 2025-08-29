<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Payment Gateway
    |--------------------------------------------------------------------------
    |
    | This option controls the default payment gateway that will be used
    | when no specific gateway is specified.
    |
    */

    'default' => env('PAYMENT_DEFAULT_GATEWAY', 'stripe'),

    /*
    |--------------------------------------------------------------------------
    | Payment Gateways
    |--------------------------------------------------------------------------
    |
    | Here you may configure the payment gateways for your application.
    | Each gateway has its own configuration options.
    |
    */

    'gateways' => [

        'stripe' => [
            'enabled' => env('STRIPE_ENABLED', true),
            'key' => env('STRIPE_KEY'),
            'secret' => env('STRIPE_SECRET'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
            'currency' => env('STRIPE_CURRENCY', 'usd'),
            'api_version' => '2023-10-16',
        ],

        'paypal' => [
            'enabled' => env('PAYPAL_ENABLED', true),
            'client_id' => env('PAYPAL_CLIENT_ID'),
            'client_secret' => env('PAYPAL_CLIENT_SECRET'),
            'mode' => env('PAYPAL_MODE', 'sandbox'), // sandbox or live
            'currency' => env('PAYPAL_CURRENCY', 'USD'),
            'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
        ],

        'bank_transfer' => [
            'enabled' => env('BANK_TRANSFER_ENABLED', true),
            'accounts' => [
                [
                    'bank_name' => env('BANK_1_NAME', 'Bank Central Asia'),
                    'account_number' => env('BANK_1_ACCOUNT'),
                    'account_name' => env('BANK_1_ACCOUNT_NAME'),
                ],
                [
                    'bank_name' => env('BANK_2_NAME', 'Bank Mandiri'),
                    'account_number' => env('BANK_2_ACCOUNT'),
                    'account_name' => env('BANK_2_ACCOUNT_NAME'),
                ],
            ],
        ],

        'ewallet' => [
            'enabled' => env('EWALLET_ENABLED', true),
            'providers' => [
                'gopay' => [
                    'enabled' => env('GOPAY_ENABLED', true),
                    'merchant_id' => env('GOPAY_MERCHANT_ID'),
                    'secret_key' => env('GOPAY_SECRET_KEY'),
                ],
                'ovo' => [
                    'enabled' => env('OVO_ENABLED', true),
                    'merchant_id' => env('OVO_MERCHANT_ID'),
                    'secret_key' => env('OVO_SECRET_KEY'),
                ],
                'dana' => [
                    'enabled' => env('DANA_ENABLED', true),
                    'merchant_id' => env('DANA_MERCHANT_ID'),
                    'secret_key' => env('DANA_SECRET_KEY'),
                ],
            ],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Settings
    |--------------------------------------------------------------------------
    |
    | General payment configuration options.
    |
    */

    'settings' => [
        'minimum_amount' => env('PAYMENT_MINIMUM_AMOUNT', 10000), // in cents/smallest currency unit
        'maximum_amount' => env('PAYMENT_MAXIMUM_AMOUNT', 100000000), // in cents/smallest currency unit
        'fee_percentage' => env('PAYMENT_FEE_PERCENTAGE', 2.9), // platform fee percentage
        'fixed_fee' => env('PAYMENT_FIXED_FEE', 30), // fixed fee in cents
        'auto_capture' => env('PAYMENT_AUTO_CAPTURE', true),
        'webhook_tolerance' => env('PAYMENT_WEBHOOK_TOLERANCE', 300), // seconds
    ],

    /*
    |--------------------------------------------------------------------------
    | Withdrawal Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for withdrawal/payout functionality.
    |
    */

    'withdrawal' => [
        'minimum_amount' => env('WITHDRAWAL_MINIMUM_AMOUNT', 50000), // in cents
        'maximum_amount' => env('WITHDRAWAL_MAXIMUM_AMOUNT', 50000000), // in cents
        'processing_days' => env('WITHDRAWAL_PROCESSING_DAYS', 3), // business days
        'fee_percentage' => [
            'bank_transfer' => env('WITHDRAWAL_BANK_FEE_PERCENTAGE', 1.0),
            'paypal' => env('WITHDRAWAL_PAYPAL_FEE_PERCENTAGE', 2.0),
            'ewallet' => env('WITHDRAWAL_EWALLET_FEE_PERCENTAGE', 1.5),
        ],
        'fixed_fee' => [
            'bank_transfer' => env('WITHDRAWAL_BANK_FIXED_FEE', 2500), // in cents
            'paypal' => env('WITHDRAWAL_PAYPAL_FIXED_FEE', 0),
            'ewallet' => env('WITHDRAWAL_EWALLET_FIXED_FEE', 1000),
        ],
    ],

];