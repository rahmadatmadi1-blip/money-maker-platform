<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Get user's orders
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $type = $request->get('type', 'buyer'); // buyer or seller
            $status = $request->get('status', '');

            $query = Order::with([
                'product:id,title,images,category',
                'buyer:id,name,email',
                'seller:id,name,email'
            ]);

            // Filter by user type
            if ($type === 'buyer') {
                $query->where('buyer_id', auth()->id());
            } elseif ($type === 'seller') {
                $query->where('seller_id', auth()->id());
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
                'message' => 'Terjadi kesalahan saat mengambil data order'
            ], 500);
        }
    }

    /**
     * Get single order
     */
    public function show($id)
    {
        try {
            $order = Order::with([
                'product:id,title,description,images,category,files',
                'buyer:id,name,email,avatar',
                'seller:id,name,email,avatar'
            ])->where(function($query) {
                $query->where('buyer_id', auth()->id())
                      ->orWhere('seller_id', auth()->id());
            })->findOrFail($id);

            return response()->json([
                'success' => true,
                'order' => $order
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Create new order
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'payment_method' => 'required|in:stripe,paypal,bank_transfer,ewallet',
            'buyer_notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $product = Product::where('id', $request->product_id)
                            ->where('status', 'active')
                            ->firstOrFail();

            // Check if user is trying to buy their own product
            if ($product->seller_id === auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak dapat membeli produk sendiri'
                ], 400);
            }

            // Check stock for non-digital products
            if (!$product->is_digital && !$product->is_unlimited) {
                if ($product->stock < $request->quantity) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Stok tidak mencukupi'
                    ], 400);
                }
            }

            $unitPrice = $product->price;
            $totalAmount = $unitPrice * $request->quantity;
            $orderNumber = $this->generateOrderNumber();

            // Set access expiry for digital products
            $accessExpiresAt = null;
            $downloadsRemaining = null;
            
            if ($product->is_digital) {
                if ($product->expiry_days > 0) {
                    $accessExpiresAt = now()->addDays($product->expiry_days);
                }
                if ($product->download_limit > 0) {
                    $downloadsRemaining = $product->download_limit;
                }
            }

            $order = Order::create([
                'buyer_id' => auth()->id(),
                'seller_id' => $product->seller_id,
                'product_id' => $product->id,
                'order_number' => $orderNumber,
                'quantity' => $request->quantity,
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'payment_method' => $request->payment_method,
                'downloads_remaining' => $downloadsRemaining,
                'access_expires_at' => $accessExpiresAt,
                'status' => 'pending',
                'payment_status' => 'pending'
            ]);

            // Update product stock for non-digital products
            if (!$product->is_digital && !$product->is_unlimited) {
                $product->decrement('stock', $request->quantity);
                if ($product->stock <= 0) {
                    $product->update(['status' => 'inactive']);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Order berhasil dibuat',
                'order' => $order->load(['product:id,title,images', 'seller:id,name'])
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat order'
            ], 500);
        }
    }

    /**
     * Update order status (Seller only)
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:processing,completed,cancelled,refunded',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = Order::where('id', $id)
                        ->where('seller_id', auth()->id())
                        ->firstOrFail();

            // Validate status transition
            if (!$this->isValidStatusTransition($order->status, $request->status)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transisi status tidak valid'
                ], 400);
            }

            $updateData = ['status' => $request->status];

            // Set timestamps based on status
            if ($request->status === 'processing') {
                $updateData['processed_at'] = now();
            } elseif ($request->status === 'completed') {
                $updateData['completed_at'] = now();
                
                // Update product sales and seller earnings
                $product = $order->product;
                $product->increment('sales', $order->quantity);
                $product->increment('revenue', $order->total_amount);
                
                // Add earnings to seller (80% to seller, 20% platform fee)
                $sellerEarnings = $order->total_amount * 0.8;
                $seller = User::find($order->seller_id);
                $seller->increment('earnings_available', $sellerEarnings);
                $seller->increment('total_earnings', $sellerEarnings);
            }

            $order->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Status order berhasil diperbarui',
                'order' => $order->load(['product:id,title', 'buyer:id,name'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan atau Anda bukan penjualnya'
            ], 404);
        }
    }

    /**
     * Cancel order (Buyer only)
     */
    public function cancel($id)
    {
        try {
            $order = Order::where('id', $id)
                        ->where('buyer_id', auth()->id())
                        ->where('status', 'pending')
                        ->firstOrFail();

            $order->update(['status' => 'cancelled']);

            // Restore product stock if applicable
            $product = $order->product;
            if (!$product->is_digital && !$product->is_unlimited) {
                $product->increment('stock', $order->quantity);
                if ($product->status === 'inactive' && $product->stock > 0) {
                    $product->update(['status' => 'active']);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Order berhasil dibatalkan'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak dapat dibatalkan'
            ], 400);
        }
    }

    /**
     * Download digital product
     */
    public function download($id)
    {
        try {
            $order = Order::with('product')
                        ->where('id', $id)
                        ->where('buyer_id', auth()->id())
                        ->where('status', 'completed')
                        ->firstOrFail();

            $product = $order->product;

            // Check if product is digital
            if (!$product->is_digital) {
                return response()->json([
                    'success' => false,
                    'message' => 'Produk ini bukan produk digital'
                ], 400);
            }

            // Check access expiry
            if ($order->access_expires_at && $order->access_expires_at < now()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses download telah kedaluwarsa'
                ], 403);
            }

            // Check download limit
            if ($order->downloads_remaining !== null && $order->downloads_remaining <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Batas download telah tercapai'
                ], 403);
            }

            // Decrement download count
            if ($order->downloads_remaining !== null) {
                $order->decrement('downloads_remaining');
            }

            return response()->json([
                'success' => true,
                'message' => 'Download berhasil',
                'files' => $product->files,
                'downloads_remaining' => $order->downloads_remaining
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan atau tidak dapat didownload'
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
                'total_orders' => Order::where('buyer_id', $userId)->count(),
                'completed_orders' => Order::where('buyer_id', $userId)->where('status', 'completed')->count(),
                'pending_orders' => Order::where('buyer_id', $userId)->where('status', 'pending')->count(),
                'total_spent' => Order::where('buyer_id', $userId)->where('status', 'completed')->sum('total_amount')
            ];

            $sellerStats = [
                'total_sales' => Order::where('seller_id', $userId)->count(),
                'completed_sales' => Order::where('seller_id', $userId)->where('status', 'completed')->count(),
                'pending_sales' => Order::where('seller_id', $userId)->where('status', 'pending')->count(),
                'total_revenue' => Order::where('seller_id', $userId)->where('status', 'completed')->sum('total_amount')
            ];

            return response()->json([
                'success' => true,
                'buyer_stats' => $buyerStats,
                'seller_stats' => $sellerStats
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
            $orderNumber = 'ORD-' . date('Ymd') . '-' . strtoupper(Str::random(6));
        } while (Order::where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }

    /**
     * Check if status transition is valid
     */
    private function isValidStatusTransition($currentStatus, $newStatus)
    {
        $validTransitions = [
            'pending' => ['processing', 'cancelled'],
            'processing' => ['completed', 'cancelled'],
            'completed' => ['refunded'],
            'cancelled' => [],
            'refunded' => []
        ];

        return in_array($newStatus, $validTransitions[$currentStatus] ?? []);
    }
}