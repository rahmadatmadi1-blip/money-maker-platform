<?php

namespace App\Services;

use PayPal\Rest\ApiContext;
use PayPal\Auth\OAuthTokenCredential;
use PayPal\Api\Payment;
use PayPal\Api\PaymentExecution;
use PayPal\Api\Transaction;
use PayPal\Api\Amount;
use PayPal\Api\Payer;
use PayPal\Api\RedirectUrls;
use PayPal\Api\Item;
use PayPal\Api\ItemList;
use PayPal\Api\Details;
use PayPal\Exception\PayPalException;
use Exception;
use Illuminate\Support\Facades\Log;

class PayPalService
{
    private $apiContext;

    public function __construct()
    {
        $this->apiContext = new ApiContext(
            new OAuthTokenCredential(
                config('payment.gateways.paypal.client_id'),
                config('payment.gateways.paypal.client_secret')
            )
        );

        $this->apiContext->setConfig([
            'mode' => config('payment.gateways.paypal.mode'),
            'log.LogEnabled' => true,
            'log.FileName' => storage_path('logs/paypal.log'),
            'log.LogLevel' => 'ERROR',
            'cache.enabled' => true,
        ]);
    }

    /**
     * Create payment
     */
    public function createPayment(array $data): array
    {
        try {
            $payer = new Payer();
            $payer->setPaymentMethod('paypal');

            // Create item list
            $itemList = new ItemList();
            if (isset($data['items'])) {
                $items = [];
                foreach ($data['items'] as $itemData) {
                    $item = new Item();
                    $item->setName($itemData['name'])
                         ->setCurrency($itemData['currency'] ?? config('payment.gateways.paypal.currency'))
                         ->setQuantity($itemData['quantity'])
                         ->setPrice($itemData['price']);
                    $items[] = $item;
                }
                $itemList->setItems($items);
            }

            // Set amount
            $amount = new Amount();
            $amount->setCurrency($data['currency'] ?? config('payment.gateways.paypal.currency'))
                   ->setTotal($data['total']);

            // Set transaction
            $transaction = new Transaction();
            $transaction->setAmount($amount)
                       ->setItemList($itemList)
                       ->setDescription($data['description'] ?? 'Payment')
                       ->setInvoiceNumber($data['invoice_number'] ?? uniqid());

            // Set redirect URLs
            $redirectUrls = new RedirectUrls();
            $redirectUrls->setReturnUrl($data['return_url'])
                        ->setCancelUrl($data['cancel_url']);

            // Create payment
            $payment = new Payment();
            $payment->setIntent('sale')
                   ->setPayer($payer)
                   ->setRedirectUrls($redirectUrls)
                   ->setTransactions([$transaction]);

            $payment->create($this->apiContext);

            return [
                'success' => true,
                'payment' => $payment,
                'approval_url' => $this->getApprovalUrl($payment),
            ];
        } catch (PayPalException $e) {
            Log::error('PayPal Payment Creation Failed', [
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
     * Execute payment
     */
    public function executePayment(string $paymentId, string $payerId): array
    {
        try {
            $payment = Payment::get($paymentId, $this->apiContext);
            
            $execution = new PaymentExecution();
            $execution->setPayerId($payerId);

            $result = $payment->execute($execution, $this->apiContext);

            return [
                'success' => true,
                'payment' => $result,
                'status' => $result->getState(),
            ];
        } catch (PayPalException $e) {
            Log::error('PayPal Payment Execution Failed', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId,
                'payer_id' => $payerId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get payment details
     */
    public function getPayment(string $paymentId): array
    {
        try {
            $payment = Payment::get($paymentId, $this->apiContext);

            return [
                'success' => true,
                'payment' => $payment,
            ];
        } catch (PayPalException $e) {
            Log::error('PayPal Payment Retrieval Failed', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get approval URL from payment
     */
    private function getApprovalUrl(Payment $payment): ?string
    {
        $links = $payment->getLinks();
        
        foreach ($links as $link) {
            if ($link->getRel() === 'approval_url') {
                return $link->getHref();
            }
        }
        
        return null;
    }

    /**
     * Handle webhook
     */
    public function handleWebhook(array $payload): array
    {
        try {
            Log::info('PayPal Webhook Received', [
                'event_type' => $payload['event_type'] ?? 'unknown',
                'resource_type' => $payload['resource_type'] ?? 'unknown'
            ]);

            // Verify webhook signature if webhook ID is configured
            if (config('payment.gateways.paypal.webhook_id')) {
                // Add webhook verification logic here
                // This would require additional PayPal webhook verification
            }

            return [
                'success' => true,
                'event' => $payload,
            ];
        } catch (Exception $e) {
            Log::error('PayPal Webhook Processing Failed', [
                'error' => $e->getMessage(),
                'payload' => $payload
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
    public function calculateFee(float $amount): float
    {
        $feePercentage = config('payment.settings.fee_percentage', 2.9);
        $fixedFee = config('payment.settings.fixed_fee', 0.30);
        
        return ($amount * $feePercentage / 100) + $fixedFee;
    }

    /**
     * Refund payment
     */
    public function refundPayment(string $saleId, ?float $amount = null): array
    {
        try {
            $sale = \PayPal\Api\Sale::get($saleId, $this->apiContext);
            
            $refund = new \PayPal\Api\Refund();
            if ($amount) {
                $refundAmount = new Amount();
                $refundAmount->setCurrency(config('payment.gateways.paypal.currency'))
                           ->setTotal($amount);
                $refund->setAmount($refundAmount);
            }

            $refundedSale = $sale->refund($refund, $this->apiContext);

            return [
                'success' => true,
                'refund' => $refundedSale,
            ];
        } catch (PayPalException $e) {
            Log::error('PayPal Refund Failed', [
                'error' => $e->getMessage(),
                'sale_id' => $saleId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Format amount for PayPal (2 decimal places)
     */
    public function formatAmount(int $amountInCents): string
    {
        return number_format($amountInCents / 100, 2, '.', '');
    }

    /**
     * Convert amount to cents
     */
    public function convertToCents(float $amount): int
    {
        return (int) ($amount * 100);
    }
}