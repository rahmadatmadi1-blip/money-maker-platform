<?php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class WithdrawalController extends Controller
{
    /**
     * Get user's withdrawals
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $status = $request->get('status', '');

            $query = Withdrawal::with([
                'user:id,name,email',
                'paymentMethod:id,type,account_name,account_number'
            ])->where('user_id', auth()->id());

            // Status filter
            if ($status) {
                $query->where('status', $status);
            }

            $withdrawals = $query->orderBy('created_at', 'desc')
                                ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'withdrawals' => $withdrawals->items(),
                'pagination' => [
                    'current' => $withdrawals->currentPage(),
                    'pages' => $withdrawals->lastPage(),
                    'total' => $withdrawals->total(),
                    'limit' => $withdrawals->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data penarikan'
            ], 500);
        }
    }

    /**
     * Get single withdrawal
     */
    public function show($id)
    {
        try {
            $withdrawal = Withdrawal::with([
                'user:id,name,email',
                'paymentMethod:id,type,account_name,account_number,bank_name'
            ])->where('id', $id)
              ->where('user_id', auth()->id())
              ->firstOrFail();

            return response()->json([
                'success' => true,
                'withdrawal' => $withdrawal
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Penarikan tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Create withdrawal request
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:10|max:10000',
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
            $user = User::find(auth()->id());
            $paymentMethod = PaymentMethod::where('id', $request->payment_method_id)
                                        ->where('user_id', auth()->id())
                                        ->where('is_active', true)
                                        ->firstOrFail();

            // Check if user has sufficient balance
            if ($user->earnings_available < $request->amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Saldo tidak mencukupi untuk penarikan ini'
                ], 400);
            }

            // Check minimum withdrawal amount
            $minWithdrawal = 10; // $10 minimum
            if ($request->amount < $minWithdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => "Jumlah penarikan minimum adalah ${$minWithdrawal}"
                ], 400);
            }

            // Check for pending withdrawals
            $pendingWithdrawals = Withdrawal::where('user_id', auth()->id())
                                          ->whereIn('status', ['pending', 'processing'])
                                          ->count();

            if ($pendingWithdrawals >= 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda memiliki terlalu banyak penarikan yang sedang diproses'
                ], 400);
            }

            // Calculate fees
            $feePercentage = $this->calculateFeePercentage($paymentMethod->type, $request->amount);
            $feeAmount = $request->amount * ($feePercentage / 100);
            $netAmount = $request->amount - $feeAmount;

            // Create withdrawal request
            $withdrawal = Withdrawal::create([
                'user_id' => auth()->id(),
                'payment_method_id' => $request->payment_method_id,
                'amount' => $request->amount,
                'fee_amount' => $feeAmount,
                'net_amount' => $netAmount,
                'currency' => 'USD',
                'status' => 'pending',
                'notes' => $request->notes
            ]);

            // Deduct amount from user's available earnings
            $user->decrement('earnings_available', $request->amount);
            $user->increment('earnings_pending', $request->amount);

            return response()->json([
                'success' => true,
                'message' => 'Permintaan penarikan berhasil dibuat',
                'withdrawal' => $withdrawal->load('paymentMethod:id,type,account_name')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat permintaan penarikan'
            ], 500);
        }
    }

    /**
     * Cancel withdrawal request
     */
    public function cancel($id)
    {
        try {
            $withdrawal = Withdrawal::where('id', $id)
                                  ->where('user_id', auth()->id())
                                  ->where('status', 'pending')
                                  ->firstOrFail();

            $withdrawal->update([
                'status' => 'cancelled',
                'cancelled_at' => now()
            ]);

            // Restore user's available earnings
            $user = User::find(auth()->id());
            $user->increment('earnings_available', $withdrawal->amount);
            $user->decrement('earnings_pending', $withdrawal->amount);

            return response()->json([
                'success' => true,
                'message' => 'Permintaan penarikan berhasil dibatalkan'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Penarikan tidak dapat dibatalkan'
            ], 400);
        }
    }

    /**
     * Get withdrawal statistics
     */
    public function statistics()
    {
        try {
            $userId = auth()->id();
            
            $stats = [
                'total_withdrawals' => Withdrawal::where('user_id', $userId)->count(),
                'completed_withdrawals' => Withdrawal::where('user_id', $userId)->where('status', 'completed')->count(),
                'pending_withdrawals' => Withdrawal::where('user_id', $userId)->whereIn('status', ['pending', 'processing'])->count(),
                'total_withdrawn' => Withdrawal::where('user_id', $userId)->where('status', 'completed')->sum('net_amount'),
                'total_fees_paid' => Withdrawal::where('user_id', $userId)->where('status', 'completed')->sum('fee_amount'),
                'pending_amount' => Withdrawal::where('user_id', $userId)->whereIn('status', ['pending', 'processing'])->sum('amount')
            ];

            return response()->json([
                'success' => true,
                'statistics' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil statistik penarikan'
            ], 500);
        }
    }

    /**
     * Get available balance
     */
    public function balance()
    {
        try {
            $user = User::find(auth()->id());
            
            return response()->json([
                'success' => true,
                'balance' => [
                    'available' => $user->earnings_available,
                    'pending' => $user->earnings_pending,
                    'total' => $user->total_earnings
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil saldo'
            ], 500);
        }
    }

    /**
     * Admin: Get all withdrawals
     */
    public function adminIndex(Request $request)
    {
        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $page = $request->get('page', 1);
            $limit = $request->get('limit', 20);
            $status = $request->get('status', '');
            $search = $request->get('search', '');

            $query = Withdrawal::with([
                'user:id,name,email',
                'paymentMethod:id,type,account_name,account_number,bank_name'
            ]);

            // Status filter
            if ($status) {
                $query->where('status', $status);
            }

            // Search filter
            if ($search) {
                $query->whereHas('user', function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $withdrawals = $query->orderBy('created_at', 'desc')
                                ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'withdrawals' => $withdrawals->items(),
                'pagination' => [
                    'current' => $withdrawals->currentPage(),
                    'pages' => $withdrawals->lastPage(),
                    'total' => $withdrawals->total(),
                    'limit' => $withdrawals->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data penarikan'
            ], 500);
        }
    }

    /**
     * Admin: Process withdrawal
     */
    public function adminProcess(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'admin_notes' => 'nullable|string|max:500',
            'transaction_id' => 'nullable|string|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $withdrawal = Withdrawal::with('user')->findOrFail($id);

            if (!in_array($withdrawal->status, ['pending', 'processing'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Penarikan ini sudah diproses'
                ], 400);
            }

            if ($request->action === 'approve') {
                $withdrawal->update([
                    'status' => 'completed',
                    'processed_by' => auth()->id(),
                    'processed_at' => now(),
                    'admin_notes' => $request->admin_notes,
                    'gateway_transaction_id' => $request->transaction_id
                ]);

                // Update user earnings
                $user = $withdrawal->user;
                $user->decrement('earnings_pending', $withdrawal->amount);

                $message = 'Penarikan berhasil disetujui dan diproses';
            } else {
                $withdrawal->update([
                    'status' => 'rejected',
                    'processed_by' => auth()->id(),
                    'processed_at' => now(),
                    'admin_notes' => $request->admin_notes
                ]);

                // Restore user's available earnings
                $user = $withdrawal->user;
                $user->increment('earnings_available', $withdrawal->amount);
                $user->decrement('earnings_pending', $withdrawal->amount);

                $message = 'Penarikan ditolak';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'withdrawal' => $withdrawal
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses penarikan'
            ], 500);
        }
    }

    /**
     * Admin: Get withdrawal statistics
     */
    public function adminStatistics()
    {
        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $stats = [
                'total_withdrawals' => Withdrawal::count(),
                'pending_withdrawals' => Withdrawal::where('status', 'pending')->count(),
                'processing_withdrawals' => Withdrawal::where('status', 'processing')->count(),
                'completed_withdrawals' => Withdrawal::where('status', 'completed')->count(),
                'rejected_withdrawals' => Withdrawal::where('status', 'rejected')->count(),
                'total_amount_withdrawn' => Withdrawal::where('status', 'completed')->sum('net_amount'),
                'total_fees_collected' => Withdrawal::where('status', 'completed')->sum('fee_amount'),
                'pending_amount' => Withdrawal::whereIn('status', ['pending', 'processing'])->sum('amount')
            ];

            return response()->json([
                'success' => true,
                'statistics' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil statistik'
            ], 500);
        }
    }

    /**
     * Calculate fee percentage based on payment method and amount
     */
    private function calculateFeePercentage($paymentMethodType, $amount)
    {
        $fees = [
            'bank_transfer' => 2.5,
            'paypal' => 3.5,
            'stripe' => 3.0,
            'ewallet' => 2.0
        ];

        $baseFee = $fees[$paymentMethodType] ?? 3.0;

        // Reduce fee for larger amounts
        if ($amount >= 1000) {
            $baseFee -= 0.5;
        } elseif ($amount >= 500) {
            $baseFee -= 0.25;
        }

        return max($baseFee, 1.5); // Minimum 1.5% fee
    }
}