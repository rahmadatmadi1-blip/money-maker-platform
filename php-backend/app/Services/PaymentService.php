<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Order;
use App\Models\ServiceOrder;
use App\Models\ContentPurchase;
use App\Services\StripeService;
use App\Services\PayPalService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentService
{
    protected $stripeService;
    protected $paypalService;

    public function __construct(StripeService $stripeService, PayPalService $paypalService)
    {
        $this->stripeService = $stripeService;
        $this->paypalService = $paypalService;
    }

    /**
     * Process payment for order
     */
    public function processOrderPayment(array $data): array
    {
        try {
            DB::beginTransaction();

            $order = Order::findOrFail($data['order_id']);
            
            // Create payment record
            $payment = Payment::create([
                'user_id' => $data['user_id'],
                'payable_type' => Order::class,
                'payable_id' => $order->id,
                'amount' => $order->total_amount,
                'currency' => $data['currency'] ?? 'USD',
                'payment_method' => $data['payment_method'],
                'status' => 'pending',
                'reference_id' => $this->generateReferenceId(),
                'metadata' => $data['metadata'] ?? [],
            ]);

            // Process payment based on method
            $result = $this->processPaymentByMethod($payment, $data);

            if ($result['success']) {
                $payment->update([
                    'status' => 'processing',
                    'gateway_payment_id' => $result['gateway_payment_id'] ?? null,
                    'gateway_response' => $result['gateway_response'] ?? null,
                ]);

                DB::commit();

                return [
                    'success' => true,
                    'payment' => $payment,
                    'gateway_data' => $result['gateway_data'] ?? null,
                ];
            } else {
                $payment->update(['status' => 'failed']);
                DB::rollBack();

                return [
                    'success' => false,
                    'error' => $result['error'],
                ];
            }
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Order Payment Processing Failed', [
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
     * Process payment for service order
     */
    public function processServicePayment(array $data): array
    {
        try {
            DB::beginTransaction();

            $serviceOrder = ServiceOrder::findOrFail($data['service_order_id']);
            
            $payment = Payment::create([
                'user_id' => $data['user_id'],
                'payable_type' => ServiceOrder::class,
                'payable_id' => $serviceOrder->id,
                'amount' => $serviceOrder->total_amount,
                'currency' => $data['currency'] ?? 'USD',
                'payment_method' => $data['payment_method'],
                'status' => 'pending',
                'reference_id' => $this->generateReferenceId(),
                'metadata' => $data['metadata'] ?? [],
            ]);

            $result = $this->processPaymentByMethod($payment, $data);

            if ($result['success']) {
                $payment->update([
                    'status' => 'processing',
                    'gateway_payment_id' => $result['gateway_payment_id'] ?? null,
                    'gateway_response' => $result['gateway_response'] ?? null,
                ]);

                DB::commit();

                return [
                    'success' => true,
                    'payment' => $payment,
                    'gateway_data' => $result['gateway_data'] ?? null,
                ];
            } else {
                $payment->update(['status' => 'failed']);
                DB::rollBack();

                return [
                    'success' => false,
                    'error' => $result['error'],
                ];
            }
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Service Payment Processing Failed', [
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
     * Process payment for content purchase
     */
    public function processContentPayment(array $data): array
    {
        try {
            DB::beginTransaction();

            $contentPurchase = ContentPurchase::findOrFail($data['content_purchase_id']);
            
            $payment = Payment::create([
                'user_id' => $data['user_id'],
                'payable_type' => ContentPurchase::class,
                'payable_id' => $contentPurchase->id,
                'amount' => $contentPurchase->amount,
                'currency' => $data['currency'] ?? 'USD',
                'payment_method' => $data['payment_method'],
                'status' => 'pending',
                'reference_id' => $this->generateReferenceId(),
                'metadata' => $data['metadata'] ?? [],
            ]);

            $result = $this->processPaymentByMethod($payment, $data);

            if ($result['success']) {
                $payment->update([
                    'status' => 'processing',
                    'gateway_payment_id' => $result['gateway_payment_id'] ?? null,
                    'gateway_response' => $result['gateway_response'] ?? null,
                ]);

                DB::commit();

                return [
                    'success' => true,
                    'payment' => $payment,
                    'gateway_data' => $result['gateway_data'] ?? null,
                ];
            } else {
                $payment->update(['status' => 'failed']);
                DB::rollBack();

                return [
                    'success' => false,
                    'error' => $result['error'],
                ];
            }
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Content Payment Processing Failed', [
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
     * Process payment by method
     */
    private function processPaymentByMethod(Payment $payment, array $data): array
    {
        switch ($data['payment_method']) {
            case 'stripe':
                return $this->processStripePayment($payment, $data);
            
            case 'paypal':
                return $this->processPayPalPayment($payment, $data);
            
            case 'bank_transfer':
                return $this->processBankTransferPayment($payment, $data);
            
            case 'ewallet':
                return $this->processEWalletPayment($payment, $data);
            
            default:
                return [
                    'success' => false,
                    'error' => 'Unsupported payment method',
                ];
        }
    }

    /**
     * Process Stripe payment
     */
    private function processStripePayment(Payment $payment, array $data): array
    {
        $result = $this->stripeService->createPaymentIntent([
            'amount' => $payment->amount * 100, // Convert to cents
            'currency' => strtolower($payment->currency),
            'metadata' => [
                'payment_id' => $payment->id,
                'user_id' => $payment->user_id,
            ],
            'description' => "Payment for {$payment->payable_type} #{$payment->payable_id}",
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'gateway_payment_id' => $result['payment_intent']->id,
                'gateway_response' => $result['payment_intent']->toArray(),
                'gateway_data' => [
                    'client_secret' => $result['client_secret'],
                ],
            ];
        }

        return $result;
    }

    /**
     * Process PayPal payment
     */
    private function processPayPalPayment(Payment $payment, array $data): array
    {
        $result = $this->paypalService->createPayment([
            'total' => $this->paypalService->formatAmount($payment->amount * 100),
            'currency' => $payment->currency,
            'description' => "Payment for {$payment->payable_type} #{$payment->payable_id}",
            'invoice_number' => $payment->reference_id,
            'return_url' => $data['return_url'] ?? url('/payment/paypal/success'),
            'cancel_url' => $data['cancel_url'] ?? url('/payment/paypal/cancel'),
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'gateway_payment_id' => $result['payment']->getId(),
                'gateway_response' => $result['payment']->toArray(),
                'gateway_data' => [
                    'approval_url' => $result['approval_url'],
                ],
            ];
        }

        return $result;
    }

    /**
     * Process bank transfer payment
     */
    private function processBankTransferPayment(Payment $payment, array $data): array
    {
        // Bank transfer is manual, so we just mark it as pending
        return [
            'success' => true,
            'gateway_payment_id' => $payment->reference_id,
            'gateway_response' => ['method' => 'bank_transfer'],
            'gateway_data' => [
                'bank_accounts' => config('payment.gateways.bank_transfer.accounts'),
                'reference_id' => $payment->reference_id,
            ],
        ];
    }

    /**
     * Process e-wallet payment
     */
    private function processEWalletPayment(Payment $payment, array $data): array
    {
        // E-wallet integration would go here
        // For now, return success with manual processing
        return [
            'success' => true,
            'gateway_payment_id' => $payment->reference_id,
            'gateway_response' => ['method' => 'ewallet', 'provider' => $data['ewallet_provider'] ?? 'unknown'],
            'gateway_data' => [
                'provider' => $data['ewallet_provider'] ?? 'unknown',
                'reference_id' => $payment->reference_id,
            ],
        ];
    }

    /**
     * Confirm payment success
     */
    public function confirmPayment(Payment $payment): bool
    {
        try {
            DB::beginTransaction();

            $payment->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            // Update related model status
            $this->updateRelatedModelStatus($payment);

            // Add earnings to seller
            $this->addSellerEarnings($payment);

            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Payment Confirmation Failed', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Update related model status
     */
    private function updateRelatedModelStatus(Payment $payment): void
    {
        $payable = $payment->payable;
        
        if ($payable instanceof Order) {
            $payable->update(['status' => 'paid']);
        } elseif ($payable instanceof ServiceOrder) {
            $payable->update(['status' => 'in_progress']);
        } elseif ($payable instanceof ContentPurchase) {
            $payable->update(['status' => 'completed']);
        }
    }

    /**
     * Add earnings to seller
     */
    private function addSellerEarnings(Payment $payment): void
    {
        $payable = $payment->payable;
        $fee = $this->calculatePlatformFee($payment->amount);
        $sellerEarnings = $payment->amount - $fee;

        if ($payable instanceof Order && $payable->product->user) {
            $payable->product->user->addEarnings($sellerEarnings, 'pending');
        } elseif ($payable instanceof ServiceOrder && $payable->service->user) {
            $payable->service->user->addEarnings($sellerEarnings, 'pending');
        } elseif ($payable instanceof ContentPurchase && $payable->content->user) {
            $payable->content->user->addEarnings($sellerEarnings, 'pending');
        }
    }

    /**
     * Calculate platform fee
     */
    private function calculatePlatformFee(int $amount): int
    {
        $feePercentage = config('payment.settings.fee_percentage', 2.9);
        $fixedFee = config('payment.settings.fixed_fee', 30);
        
        return (int) (($amount * $feePercentage / 100) + $fixedFee);
    }

    /**
     * Generate unique reference ID
     */
    private function generateReferenceId(): string
    {
        return 'PAY_' . strtoupper(Str::random(12)) . '_' . time();
    }
}