<?php

namespace App\Services;

use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Customer;
use Stripe\PaymentMethod;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;
use Exception;
use Illuminate\Support\Facades\Log;

class StripeService
{
    public function __construct()
    {
        Stripe::setApiKey(config('payment.gateways.stripe.secret'));
    }

    /**
     * Create payment intent
     */
    public function createPaymentIntent(array $data): array
    {
        try {
            $paymentIntent = PaymentIntent::create([
                'amount' => $data['amount'], // amount in cents
                'currency' => $data['currency'] ?? config('payment.gateways.stripe.currency'),
                'payment_method_types' => ['card'],
                'metadata' => $data['metadata'] ?? [],
                'description' => $data['description'] ?? null,
                'customer' => $data['customer_id'] ?? null,
            ]);

            return [
                'success' => true,
                'payment_intent' => $paymentIntent,
                'client_secret' => $paymentIntent->client_secret,
            ];
        } catch (Exception $e) {
            Log::error('Stripe Payment Intent Creation Failed', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Confirm payment intent
     */
    public function confirmPaymentIntent(string $paymentIntentId, string $paymentMethodId): array
    {
        try {
            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);
            
            $paymentIntent->confirm([
                'payment_method' => $paymentMethodId,
            ]);

            return [
                'success' => true,
                'payment_intent' => $paymentIntent,
                'status' => $paymentIntent->status,
            ];
        } catch (Exception $e) {
            Log::error('Stripe Payment Intent Confirmation Failed', [
                'error' => $e->getMessage(),
                'payment_intent_id' => $paymentIntentId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Create customer
     */
    public function createCustomer(array $data): array
    {
        try {
            $customer = Customer::create([
                'email' => $data['email'],
                'name' => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
                'metadata' => $data['metadata'] ?? [],
            ]);

            return [
                'success' => true,
                'customer' => $customer,
            ];
        } catch (Exception $e) {
            Log::error('Stripe Customer Creation Failed', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Attach payment method to customer
     */
    public function attachPaymentMethod(string $paymentMethodId, string $customerId): array
    {
        try {
            $paymentMethod = PaymentMethod::retrieve($paymentMethodId);
            $paymentMethod->attach(['customer' => $customerId]);

            return [
                'success' => true,
                'payment_method' => $paymentMethod,
            ];
        } catch (Exception $e) {
            Log::error('Stripe Payment Method Attachment Failed', [
                'error' => $e->getMessage(),
                'payment_method_id' => $paymentMethodId,
                'customer_id' => $customerId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Retrieve payment intent
     */
    public function retrievePaymentIntent(string $paymentIntentId): array
    {
        try {
            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);

            return [
                'success' => true,
                'payment_intent' => $paymentIntent,
            ];
        } catch (Exception $e) {
            Log::error('Stripe Payment Intent Retrieval Failed', [
                'error' => $e->getMessage(),
                'payment_intent_id' => $paymentIntentId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Handle webhook
     */
    public function handleWebhook(string $payload, string $signature): array
    {
        try {
            $event = Webhook::constructEvent(
                $payload,
                $signature,
                config('payment.gateways.stripe.webhook_secret')
            );

            Log::info('Stripe Webhook Received', [
                'event_type' => $event->type,
                'event_id' => $event->id
            ]);

            return [
                'success' => true,
                'event' => $event,
            ];
        } catch (SignatureVerificationException $e) {
            Log::error('Stripe Webhook Signature Verification Failed', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Invalid signature',
            ];
        } catch (Exception $e) {
            Log::error('Stripe Webhook Processing Failed', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Calculate application fee
     */
    public function calculateFee(int $amount): int
    {
        $feePercentage = config('payment.settings.fee_percentage', 2.9);
        $fixedFee = config('payment.settings.fixed_fee', 30);
        
        return (int) (($amount * $feePercentage / 100) + $fixedFee);
    }

    /**
     * Refund payment
     */
    public function refundPayment(string $paymentIntentId, ?int $amount = null): array
    {
        try {
            $refundData = ['payment_intent' => $paymentIntentId];
            
            if ($amount) {
                $refundData['amount'] = $amount;
            }

            $refund = \Stripe\Refund::create($refundData);

            return [
                'success' => true,
                'refund' => $refund,
            ];
        } catch (Exception $e) {
            Log::error('Stripe Refund Failed', [
                'error' => $e->getMessage(),
                'payment_intent_id' => $paymentIntentId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}