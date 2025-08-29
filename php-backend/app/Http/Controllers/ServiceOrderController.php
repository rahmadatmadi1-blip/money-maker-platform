<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ServiceOrderController extends Controller
{
    /**
     * Get user's service orders
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $type = $request->get('type', 'buyer'); // buyer or provider
            $status = $request->get('status', '');

            $query = ServiceOrder::with([
                'service:id,title,images,category,base_price',
                'buyer:id,name,email,avatar',
                'provider:id,name,email,avatar'
            ]);

            // Filter by user type
            if ($type === 'buyer') {
                $query->where('buyer_id', auth()->id());
            } elseif ($type === 'provider') {
                $query->where('provider_id', auth()->id());
            }

            // Status filter
            if ($status) {
                $query->where('status', $status);
            }

            $orders = $query->orderBy('created_at', 'desc')
                          ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'orders' => $orders->items(),
                'pagination' => [
                    'current' => $orders->currentPage(),
                    'pages' => $orders->lastPage(),
                    'total' => $orders->total(),
                    'limit' => $orders->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data pesanan layanan'
            ], 500);
        }
    }

    /**
     * Get single service order
     */
    public function show($id)
    {
        try {
            $order = ServiceOrder::with([
                'service:id,title,description,images,category,requirements',
                'buyer:id,name,email,avatar',
                'provider:id,name,email,avatar,rating,total_reviews'
            ])->where(function($query) {
                $query->where('buyer_id', auth()->id())
                      ->orWhere('provider_id', auth()->id());
            })->findOrFail($id);

            return response()->json([
                'success' => true,
                'order' => $order
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan layanan tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Create new service order
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'service_id' => 'required|exists:services,id',
            'package_type' => 'required|in:basic,standard,premium',
            'quantity' => 'required|integer|min:1|max:10',
            'requirements_response' => 'nullable|array',
            'special_instructions' => 'nullable|string|max:1000',
            'payment_method' => 'required|in:stripe,paypal,bank_transfer,ewallet'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $service = Service::where('id', $request->service_id)
                            ->where('status', 'active')
                            ->where('is_available', true)
                            ->firstOrFail();

            // Check if user is trying to order their own service
            if ($service->provider_id === auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak dapat memesan layanan sendiri'
                ], 400);
            }

            // Check provider availability and queue
            if ($service->queue_length >= 10) {
                return response()->json([
                    'success' => false,
                    'message' => 'Penyedia layanan sedang penuh, coba lagi nanti'
                ], 400);
            }

            // Calculate price based on package type
            $price = $this->calculatePrice($service, $request->package_type);
            $totalAmount = $price * $request->quantity;
            $orderNumber = $this->generateOrderNumber();

            // Calculate delivery date
            $deliveryDays = $service->delivery_days;
            if ($request->package_type === 'standard') {
                $deliveryDays = max(1, $deliveryDays - 1);
            } elseif ($request->package_type === 'premium') {
                $deliveryDays = max(1, $deliveryDays - 2);
            }
            $deliveryDate = now()->addDays($deliveryDays);

            $order = ServiceOrder::create([
                'service_id' => $service->id,
                'buyer_id' => auth()->id(),
                'provider_id' => $service->provider_id,
                'order_number' => $orderNumber,
                'package_type' => $request->package_type,
                'quantity' => $request->quantity,
                'amount' => $totalAmount,
                'requirements_response' => $request->requirements_response ? json_encode($request->requirements_response) : null,
                'special_instructions' => $request->special_instructions,
                'delivery_days' => $deliveryDays,
                'delivery_date' => $deliveryDate,
                'revisions_remaining' => $service->revisions,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $request->payment_method
            ]);

            // Update service queue
            $service->increment('queue_length');

            return response()->json([
                'success' => true,
                'message' => 'Pesanan layanan berhasil dibuat',
                'order' => $order->load([
                    'service:id,title,images',
                    'provider:id,name,avatar'
                ])
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat pesanan layanan'
            ], 500);
        }
    }

    /**
     * Update order status (Provider only)
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:accepted,in_progress,delivered,completed,cancelled,revision_requested',
            'message' => 'nullable|string|max:500',
            'deliverables' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = ServiceOrder::where('id', $id)
                               ->where('provider_id', auth()->id())
                               ->firstOrFail();

            // Validate status transition
            if (!$this->isValidStatusTransition($order->status, $request->status)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transisi status tidak valid'
                ], 400);
            }

            $updateData = ['status' => $request->status];

            // Set timestamps and handle specific status changes
            switch ($request->status) {
                case 'accepted':
                    $updateData['accepted_at'] = now();
                    break;
                    
                case 'in_progress':
                    $updateData['started_at'] = now();
                    break;
                    
                case 'delivered':
                    $updateData['delivered_at'] = now();
                    $updateData['deliverables'] = $request->deliverables ? json_encode($request->deliverables) : null;
                    break;
                    
                case 'completed':
                    $updateData['completed_at'] = now();
                    
                    // Update service statistics
                    $service = $order->service;
                    $service->increment('orders_completed');
                    $service->increment('revenue', $order->amount);
                    $service->decrement('queue_length');
                    
                    // Add earnings to provider (85% to provider, 15% platform fee)
                    $providerEarnings = $order->amount * 0.85;
                    $provider = User::find($order->provider_id);
                    $provider->increment('earnings_available', $providerEarnings);
                    $provider->increment('total_earnings', $providerEarnings);
                    break;
                    
                case 'cancelled':
                    // Restore service queue
                    $order->service->decrement('queue_length');
                    break;
            }

            // Add message to communication log
            if ($request->message) {
                $messages = $order->messages ? json_decode($order->messages, true) : [];
                $messages[] = [
                    'sender_id' => auth()->id(),
                    'sender_type' => 'provider',
                    'message' => $request->message,
                    'timestamp' => now()->toISOString()
                ];
                $updateData['messages'] = json_encode($messages);
            }

            $order->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Status pesanan berhasil diperbarui',
                'order' => $order->load(['service:id,title', 'buyer:id,name'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan atau Anda bukan penyedia layanannya'
            ], 404);
        }
    }

    /**
     * Request revision (Buyer only)
     */
    public function requestRevision(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'revision_notes' => 'required|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = ServiceOrder::where('id', $id)
                               ->where('buyer_id', auth()->id())
                               ->where('status', 'delivered')
                               ->firstOrFail();

            // Check if revisions are available
            if ($order->revisions_remaining <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada revisi yang tersisa'
                ], 400);
            }

            // Update order status and decrement revisions
            $order->update([
                'status' => 'revision_requested',
                'revisions_remaining' => $order->revisions_remaining - 1
            ]);

            // Add revision request to messages
            $messages = $order->messages ? json_decode($order->messages, true) : [];
            $messages[] = [
                'sender_id' => auth()->id(),
                'sender_type' => 'buyer',
                'message' => $request->revision_notes,
                'type' => 'revision_request',
                'timestamp' => now()->toISOString()
            ];
            $order->update(['messages' => json_encode($messages)]);

            return response()->json([
                'success' => true,
                'message' => 'Permintaan revisi berhasil dikirim',
                'revisions_remaining' => $order->revisions_remaining
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan atau tidak dapat direvisi'
            ], 404);
        }
    }

    /**
     * Accept delivery (Buyer only)
     */
    public function acceptDelivery($id)
    {
        try {
            $order = ServiceOrder::where('id', $id)
                               ->where('buyer_id', auth()->id())
                               ->where('status', 'delivered')
                               ->firstOrFail();

            $order->update([
                'status' => 'completed',
                'completed_at' => now()
            ]);

            // Update service statistics
            $service = $order->service;
            $service->increment('orders_completed');
            $service->increment('revenue', $order->amount);
            $service->decrement('queue_length');
            
            // Add earnings to provider
            $providerEarnings = $order->amount * 0.85;
            $provider = User::find($order->provider_id);
            $provider->increment('earnings_available', $providerEarnings);
            $provider->increment('total_earnings', $providerEarnings);

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil diselesaikan'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan atau tidak dapat diselesaikan'
            ], 404);
        }
    }

    /**
     * Cancel order
     */
    public function cancel($id)
    {
        try {
            $order = ServiceOrder::where('id', $id)
                               ->where(function($query) {
                                   $query->where('buyer_id', auth()->id())
                                         ->orWhere('provider_id', auth()->id());
                               })
                               ->whereIn('status', ['pending', 'accepted'])
                               ->firstOrFail();

            $order->update(['status' => 'cancelled']);

            // Restore service queue
            $order->service->decrement('queue_length');

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil dibatalkan'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak dapat dibatalkan'
            ], 400);
        }
    }

    /**
     * Send message
     */
    public function sendMessage(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:1000',
            'attachments' => 'nullable|array|max:5'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = ServiceOrder::where('id', $id)
                               ->where(function($query) {
                                   $query->where('buyer_id', auth()->id())
                                         ->orWhere('provider_id', auth()->id());
                               })
                               ->firstOrFail();

            // Determine sender type
            $senderType = $order->buyer_id === auth()->id() ? 'buyer' : 'provider';

            // Add message to communication log
            $messages = $order->messages ? json_decode($order->messages, true) : [];
            $messages[] = [
                'sender_id' => auth()->id(),
                'sender_type' => $senderType,
                'message' => $request->message,
                'attachments' => $request->attachments,
                'timestamp' => now()->toISOString()
            ];

            $order->update(['messages' => json_encode($messages)]);

            return response()->json([
                'success' => true,
                'message' => 'Pesan berhasil dikirim'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Get order statistics
     */
    public function statistics()
    {
        try {
            $userId = auth()->id();
            
            $buyerStats = [
                'total_orders' => ServiceOrder::where('buyer_id', $userId)->count(),
                'completed_orders' => ServiceOrder::where('buyer_id', $userId)->where('status', 'completed')->count(),
                'active_orders' => ServiceOrder::where('buyer_id', $userId)->whereIn('status', ['pending', 'accepted', 'in_progress', 'delivered'])->count(),
                'total_spent' => ServiceOrder::where('buyer_id', $userId)->where('status', 'completed')->sum('amount')
            ];

            $providerStats = [
                'total_orders' => ServiceOrder::where('provider_id', $userId)->count(),
                'completed_orders' => ServiceOrder::where('provider_id', $userId)->where('status', 'completed')->count(),
                'active_orders' => ServiceOrder::where('provider_id', $userId)->whereIn('status', ['pending', 'accepted', 'in_progress', 'delivered'])->count(),
                'total_revenue' => ServiceOrder::where('provider_id', $userId)->where('status', 'completed')->sum('amount')
            ];

            return response()->json([
                'success' => true,
                'buyer_stats' => $buyerStats,
                'provider_stats' => $providerStats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil statistik'
            ], 500);
        }
    }

    /**
     * Generate unique order number
     */
    private function generateOrderNumber()
    {
        do {
            $orderNumber = 'SRV-' . date('Ymd') . '-' . strtoupper(Str::random(6));
        } while (ServiceOrder::where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }

    /**
     * Calculate price based on package type
     */
    private function calculatePrice($service, $packageType)
    {
        switch ($packageType) {
            case 'standard':
                return $service->standard_price ?? $service->base_price;
            case 'premium':
                return $service->premium_price ?? $service->base_price;
            default:
                return $service->base_price;
        }
    }

    /**
     * Check if status transition is valid
     */
    private function isValidStatusTransition($currentStatus, $newStatus)
    {
        $validTransitions = [
            'pending' => ['accepted', 'cancelled'],
            'accepted' => ['in_progress', 'cancelled'],
            'in_progress' => ['delivered', 'cancelled'],
            'delivered' => ['completed', 'revision_requested'],
            'revision_requested' => ['in_progress', 'delivered'],
            'completed' => [],
            'cancelled' => []
        ];

        return in_array($newStatus, $validTransitions[$currentStatus] ?? []);
    }
}