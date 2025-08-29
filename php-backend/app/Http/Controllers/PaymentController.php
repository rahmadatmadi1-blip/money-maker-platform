<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Order;
use App\Models\ServiceOrder;
use App\Models\ContentPurchase;
use App\Models\User;
use App\Services\PaymentService;
use App\Services\StripeService;
use App\Services\PayPalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    protected $paymentService;
    protected $stripeService;
    protected $paypalService;

    public function __construct(
        PaymentService $paymentService,
        StripeService $stripeService,
        PayPalService $paypalService
    ) {
        $this->paymentService = $paymentService;
        $this->stripeService = $stripeService;
        $this->paypalService = $paypalService;
    }
    /**
     * Get payment methods
     */
    public function getPaymentMethods()
    {
        $methods = [
            'stripe' => [
                'name' => 'Credit/Debit Card',
                'enabled' => config('payment.gateways.stripe.enabled'),
                'currencies' => ['USD', 'EUR', 'GBP'],
            ],
            'paypal' => [
                'name' => 'PayPal',
                'enabled' => config('payment.gateways.paypal.enabled'),
                'currencies' => ['USD', 'EUR', 'GBP'],
            ],
            'bank_transfer' => [
                'name' => 'Bank Transfer',
                'enabled' => config('payment.gateways.bank_transfer.enabled'),
                'currencies' => ['USD', 'IDR'],
            ],
            'ewallet' => [
                'name' => 'E-Wallet',
                'enabled' => config('payment.gateways.ewallet.enabled'),
                'providers' => ['gopay', 'ovo', 'dana'],
                'currencies' => ['IDR'],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => array_filter($methods, fn($method) => $method['enabled'])
        ]);
    }

    /**
     * Get user's payments
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $type = $request->get('type', '');
            $status = $request->get('status', '');
            $method = $request->get('method', '');

            $query = Payment::with(['user:id,name,email', 'order:id,order_number,total_amount'])
                          ->where('user_id', auth()->id());

            // Type filter
            if ($type) {
                $query->where('type', $type);
            }

            // Status filter
            if ($status) {
                $query->where('status', $status);
            }

            // Method filter
            if ($method) {
                $query->where('payment_method', $method);
            }

            $payments = $query->orderBy('created_at', 'desc')
                            ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'payments' => $payments->items(),
                'pagination' => [
                    'current' => $payments->currentPage(),
                    'pages' => $payments->lastPage(),
                    'total' => $payments->total(),
                    'limit' => $payments->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data pembayaran'
            ], 500);
        }
    }

    /**
     * Get single payment
     */
    public function show($id)
    {
        try {
            $payment = Payment::with([
                'user:id,name,email',
                'order:id,order_number,total_amount,status'
            ])->where('id', $id)
              ->where('user_id', auth()->id())
              ->firstOrFail();

            return response()->json([
                'success' => true,
                'payment' => $payment
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Process payment for order
     */
    public function processOrderPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'payment_method' => 'required|in:stripe,paypal,bank_transfer,ewallet',
            'payment_token' => 'nullable|string',
            'return_url' => 'nullable|url'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = Order::where('id', $request->order_id)
                        ->where('buyer_id', auth()->id())
                        ->where('payment_status', 'pending')
                        ->firstOrFail();

            // Create payment record
            $payment = Payment::create([
                'user_id' => auth()->id(),
                'order_id' => $order->id,
                'amount' => $order->total_amount,
                'currency' => 'USD',
                'type' => 'purchase',
                'payment_method' => $request->payment_method,
                'status' => 'pending',
                'gateway_transaction_id' => null,
                'description' => "Payment for order #{$order->order_number}",
                'metadata' => json_encode([
                    'order_type' => 'product',
                    'product_id' => $order->product_id,
                    'quantity' => $order->quantity
                ])
            ]);

            // Process payment based on method
            $result = $this->processPaymentByMethod($payment, $request);

            if ($result['success']) {
                // Update order payment status
                $order->update([
                    'payment_status' => 'completed',
                    'payment_id' => $payment->id,
                    'status' => 'processing'
                ]);

                $payment->update([
                    'status' => 'completed',
                    'gateway_transaction_id' => $result['transaction_id'] ?? null,
                    'processed_at' => now()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Pembayaran berhasil diproses',
                    'payment' => $payment,
                    'redirect_url' => $result['redirect_url'] ?? null
                ]);
            } else {
                $payment->update([
                    'status' => 'failed',
                    'error_message' => $result['error'] ?? 'Payment processing failed'
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Pembayaran gagal diproses'
                ], 400);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses pembayaran'
            ], 500);
        }
    }

    /**
     * Process payment for service order
     */
    public function processServicePayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'service_order_id' => 'required|exists:service_orders,id',
            'payment_method' => 'required|in:stripe,paypal,bank_transfer,ewallet',
            'payment_token' => 'nullable|string',
            'return_url' => 'nullable|url'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $serviceOrder = ServiceOrder::where('id', $request->service_order_id)
                                     ->where('buyer_id', auth()->id())
                                     ->where('payment_status', 'pending')
                                     ->firstOrFail();

            // Create payment record
            $payment = Payment::create([
                'user_id' => auth()->id(),
                'order_id' => null,
                'amount' => $serviceOrder->amount,
                'currency' => 'USD',
                'type' => 'purchase',
                'payment_method' => $request->payment_method,
                'status' => 'pending',
                'gateway_transaction_id' => null,
                'description' => "Payment for service order #{$serviceOrder->order_number}",
                'metadata' => json_encode([
                    'order_type' => 'service',
                    'service_order_id' => $serviceOrder->id,
                    'service_id' => $serviceOrder->service_id,
                    'package_type' => $serviceOrder->package_type
                ])
            ]);

            // Process payment based on method
            $result = $this->processPaymentByMethod($payment, $request);

            if ($result['success']) {
                // Update service order payment status
                $serviceOrder->update([
                    'payment_status' => 'completed',
                    'payment_id' => $payment->id,
                    'status' => 'accepted'
                ]);

                $payment->update([
                    'status' => 'completed',
                    'gateway_transaction_id' => $result['transaction_id'] ?? null,
                    'processed_at' => now()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Pembayaran berhasil diproses',
                    'payment' => $payment,
                    'redirect_url' => $result['redirect_url'] ?? null
                ]);
            } else {
                $payment->update([
                    'status' => 'failed',
                    'error_message' => $result['error'] ?? 'Payment processing failed'
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Pembayaran gagal diproses'
                ], 400);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses pembayaran'
            ], 500);
        }
    }

    /**
     * Process payment for content purchase
     */
    public function processContentPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'content_purchase_id' => 'required|exists:content_purchases,id',
            'payment_method' => 'required|in:stripe,paypal,bank_transfer,ewallet',
            'payment_token' => 'nullable|string',
            'return_url' => 'nullable|url'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $contentPurchase = ContentPurchase::where('id', $request->content_purchase_id)
                                            ->where('user_id', auth()->id())
                                            ->where('status', 'pending')
                                            ->firstOrFail();

            // Create payment record
            $payment = Payment::create([
                'user_id' => auth()->id(),
                'order_id' => null,
                'amount' => $contentPurchase->amount,
                'currency' => $contentPurchase->currency,
                'type' => 'purchase',
                'payment_method' => $request->payment_method,
                'status' => 'pending',
                'gateway_transaction_id' => null,
                'description' => "Payment for content purchase",
                'metadata' => json_encode([
                    'order_type' => 'content',
                    'content_purchase_id' => $contentPurchase->id,
                    'content_id' => $contentPurchase->content_id
                ])
            ]);

            // Process payment based on method
            $result = $this->processPaymentByMethod($payment, $request);

            if ($result['success']) {
                // Update content purchase status
                $contentPurchase->update(['status' => 'active']);

                $payment->update([
                    'status' => 'completed',
                    'gateway_transaction_id' => $result['transaction_id'] ?? null,
                    'processed_at' => now()
                ]);

                // Update content statistics
                $content = $contentPurchase->content;
                $content->increment('purchases');
                $content->increment('revenue', $contentPurchase->amount);

                return response()->json([
                    'success' => true,
                    'message' => 'Pembayaran berhasil diproses',
                    'payment' => $payment,
                    'redirect_url' => $result['redirect_url'] ?? null
                ]);
            } else {
                $payment->update([
                    'status' => 'failed',
                    'error_message' => $result['error'] ?? 'Payment processing failed'
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Pembayaran gagal diproses'
                ], 400);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses pembayaran'
            ], 500);
        }
    }

    /**
     * Stripe webhook handler
     */
    public function stripeWebhook(Request $request)
    {
        try {
            $result = $this->stripeService->handleWebhook(
                $request->getContent(),
                $request->header('Stripe-Signature')
            );

            if ($result['success']) {
                $event = $result['event'];
                
                switch ($event->type) {
                    case 'payment_intent.succeeded':
                        $this->handleStripePaymentSuccess($event->data->object);
                        break;
                    
                    case 'payment_intent.payment_failed':
                        $this->handleStripePaymentFailed($event->data->object);
                        break;
                }
            }

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            Log::error('Stripe Webhook Error', [
                'error' => $e->getMessage(),
                'payload' => $request->getContent()
            ]);

            return response()->json(['success' => false], 400);
        }
    }

    /**
     * PayPal webhook handler
     */
    public function paypalWebhook(Request $request)
    {
        try {
            $result = $this->paypalService->handleWebhook(
                $request->getContent(),
                $request->headers->all()
            );

            if ($result['success']) {
                $event = $result['event'];
                
                switch ($event['event_type']) {
                    case 'PAYMENT.CAPTURE.COMPLETED':
                        $this->handlePayPalPaymentSuccess($event['resource']);
                        break;
                    
                    case 'PAYMENT.CAPTURE.DENIED':
                        $this->handlePayPalPaymentFailed($event['resource']);
                        break;
                }
            }

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            Log::error('PayPal Webhook Error', [
                'error' => $e->getMessage(),
                'payload' => $request->getContent()
            ]);

            return response()->json(['success' => false], 400);
        }
    }

    /**
     * Get payment statistics
     */
    public function statistics()
    {
        try {
            $userId = auth()->id();
            
            $stats = [
                'total_payments' => Payment::where('user_id', $userId)->count(),
                'successful_payments' => Payment::where('user_id', $userId)->where('status', 'completed')->count(),
                'failed_payments' => Payment::where('user_id', $userId)->where('status', 'failed')->count(),
                'total_spent' => Payment::where('user_id', $userId)->where('status', 'completed')->where('type', 'purchase')->sum('amount'),
                'total_received' => Payment::where('user_id', $userId)->where('status', 'completed')->where('type', 'withdrawal')->sum('amount'),
                'pending_amount' => Payment::where('user_id', $userId)->where('status', 'pending')->sum('amount')
            ];

            return response()->json([
                'success' => true,
                'statistics' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil statistik pembayaran'
            ], 500);
        }
    }

    /**
     * Process payment by method
     */
    private function processPaymentByMethod($payment, $request)
    {
        switch ($payment->payment_method) {
            case 'stripe':
                return $this->processStripePayment($payment, $request);
            case 'paypal':
                return $this->processPayPalPayment($payment, $request);
            case 'bank_transfer':
                return $this->processBankTransfer($payment, $request);
            case 'ewallet':
                return $this->processEWalletPayment($payment, $request);
            default:
                return ['success' => false, 'error' => 'Unsupported payment method'];
        }
    }

    /**
     * Process Stripe payment
     */
    private function processStripePayment($payment, $request)
    {
        try {
            $result = $this->stripeService->createPaymentIntent([
                'amount' => $payment->amount * 100, // Convert to cents
                'currency' => strtolower($payment->currency),
                'metadata' => [
                    'payment_id' => $payment->id,
                    'user_id' => $payment->user_id,
                ],
                'description' => $payment->description,
            ]);

            if ($result['success']) {
                return [
                    'success' => true,
                    'transaction_id' => $result['payment_intent']->id,
                    'redirect_url' => null,
                    'client_secret' => $result['client_secret']
                ];
            }

            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Process PayPal payment
     */
    private function processPayPalPayment($payment, $request)
    {
        try {
            $result = $this->paypalService->createPayment([
                'total' => $this->paypalService->formatAmount($payment->amount * 100),
                'currency' => $payment->currency,
                'description' => $payment->description,
                'invoice_number' => 'PAY_' . $payment->id,
                'return_url' => $request->return_url ?? url('/payment/paypal/success'),
                'cancel_url' => url('/payment/paypal/cancel'),
            ]);

            if ($result['success']) {
                return [
                    'success' => true,
                    'transaction_id' => $result['payment']->getId(),
                    'redirect_url' => $result['approval_url']
                ];
            }

            return $result;
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Process bank transfer
     */
    private function processBankTransfer($payment, $request)
    {
        // Bank transfer requires manual verification
        $payment->update(['status' => 'pending_verification']);
        
        return [
            'success' => true,
            'transaction_id' => 'bank_' . Str::random(20),
            'redirect_url' => null,
            'message' => 'Transfer bank memerlukan verifikasi manual'
        ];
    }

    /**
     * Process e-wallet payment
     */
    private function processEWalletPayment($payment, $request)
    {
        try {
            // E-wallet integration would go here
            // For now, simulate successful payment
            return [
                'success' => true,
                'transaction_id' => 'ewallet_' . Str::random(20),
                'redirect_url' => null
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Verify webhook signature
     */
    private function verifyWebhookSignature($payload, $signature, $paymentMethod)
    {
        // Implementation depends on payment gateway
        // For now, return true (in production, implement proper verification)
        return true;
    }

    /**
     * Handle Stripe payment success
     */
    private function handleStripePaymentSuccess($paymentIntent)
    {
        $paymentId = $paymentIntent->metadata->payment_id ?? null;
        
        if ($paymentId) {
            $payment = Payment::find($paymentId);
            if ($payment && in_array($payment->status, ['pending', 'processing'])) {
                $this->paymentService->confirmPayment($payment);
            }
        }
    }

    /**
     * Handle Stripe payment failed
     */
    private function handleStripePaymentFailed($paymentIntent)
    {
        $paymentId = $paymentIntent->metadata->payment_id ?? null;
        
        if ($paymentId) {
            $payment = Payment::find($paymentId);
            if ($payment && in_array($payment->status, ['pending', 'processing'])) {
                $payment->update(['status' => 'failed']);
            }
        }
    }

    /**
     * Handle PayPal payment success
     */
    private function handlePayPalPaymentSuccess($resource)
    {
        $invoiceNumber = $resource['invoice_number'] ?? null;
        
        if ($invoiceNumber && str_starts_with($invoiceNumber, 'PAY_')) {
            $paymentId = str_replace('PAY_', '', $invoiceNumber);
            $payment = Payment::find($paymentId);
            if ($payment && in_array($payment->status, ['pending', 'processing'])) {
                $this->paymentService->confirmPayment($payment);
            }
        }
    }

    /**
     * Handle PayPal payment failed
     */
    private function handlePayPalPaymentFailed($resource)
    {
        $invoiceNumber = $resource['invoice_number'] ?? null;
        
        if ($invoiceNumber && str_starts_with($invoiceNumber, 'PAY_')) {
            $paymentId = str_replace('PAY_', '', $invoiceNumber);
            $payment = Payment::find($paymentId);
            if ($payment && in_array($payment->status, ['pending', 'processing'])) {
                $payment->update(['status' => 'failed']);
            }
        }
    }

    /**
     * Update related order status
     */
    private function updateRelatedOrderStatus($payment)
    {
        $metadata = json_decode($payment->metadata, true);
        
        switch ($metadata['order_type'] ?? '') {
            case 'product':
                if ($payment->order_id) {
                    Order::where('id', $payment->order_id)
                         ->update(['payment_status' => 'completed', 'status' => 'processing']);
                }
                break;
                
            case 'service':
                if (isset($metadata['service_order_id'])) {
                    ServiceOrder::where('id', $metadata['service_order_id'])
                              ->update(['payment_status' => 'completed', 'status' => 'accepted']);
                }
                break;
                
            case 'content':
                if (isset($metadata['content_purchase_id'])) {
                    ContentPurchase::where('id', $metadata['content_purchase_id'])
                                 ->update(['status' => 'active']);
                }
                break;
        }
    }

    /**
     * Process refund
     */
    private function processRefund($payment)
    {
        // Implementation for handling refunds
        // This would include reversing order status, restoring stock, etc.
    }

    /**
     * Confirm manual payment (bank transfer, e-wallet)
     */
    public function confirmManualPayment(Request $request, $paymentId)
    {
        $validator = Validator::make($request->all(), [
            'proof_image' => 'required|image|max:2048',
            'notes' => 'sometimes|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $payment = Payment::where('id', $paymentId)
            ->where('user_id', auth()->id())
            ->whereIn('payment_method', ['bank_transfer', 'ewallet'])
            ->where('status', 'pending')
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or cannot be confirmed'
            ], 404);
        }

        // Store proof image
        $proofPath = $request->file('proof_image')->store('payment-proofs', 'public');

        $payment->update([
            'status' => 'pending_verification',
            'metadata' => array_merge(json_decode($payment->metadata, true) ?? [], [
                'proof_image' => $proofPath,
                'notes' => $request->input('notes'),
                'submitted_at' => now()->toISOString(),
            ])
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment proof submitted successfully',
            'data' => [
                'payment_id' => $payment->id,
                'status' => $payment->status,
            ]
        ]);
    }
}