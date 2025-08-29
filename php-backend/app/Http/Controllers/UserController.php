<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Get all users (Admin only)
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $search = $request->get('search', '');
            $role = $request->get('role', '');
            $status = $request->get('status', '');

            $query = User::query();

            // Search filter
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Role filter
            if ($role) {
                $query->where('role', $role);
            }

            // Status filter
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }

            $users = $query->with('referredBy:id,name,email')
                          ->select(['id', 'name', 'email', 'role', 'is_active', 'created_at', 'referred_by'])
                          ->orderBy('created_at', 'desc')
                          ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'users' => $users->items(),
                'pagination' => [
                    'current' => $users->currentPage(),
                    'pages' => $users->lastPage(),
                    'total' => $users->total(),
                    'limit' => $users->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data users'
            ], 500);
        }
    }

    /**
     * Get single user by ID
     */
    public function show($id)
    {
        try {
            $user = User::with('referredBy:id,name,email')
                       ->findOrFail($id);

            return response()->json([
                'success' => true,
                'user' => $user->makeHidden(['password', 'verification_token'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Update user (Admin only)
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'role' => 'sometimes|in:user,premium,affiliate,vendor,admin',
            'is_active' => 'sometimes|boolean',
            'phone' => 'sometimes|string|max:20',
            'address' => 'sometimes|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::findOrFail($id);
            $user->update($request->only([
                'name', 'email', 'role', 'is_active', 'phone', 'address'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'User berhasil diperbarui',
                'user' => $user->makeHidden(['password', 'verification_token'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui user'
            ], 500);
        }
    }

    /**
     * Delete user (Admin only)
     */
    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            
            // Prevent deleting admin users
            if ($user->role === 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus user admin'
                ], 403);
            }

            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'User berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menghapus user'
            ], 500);
        }
    }

    /**
     * Get user statistics (Admin only)
     */
    public function statistics()
    {
        try {
            $stats = [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'inactive_users' => User::where('is_active', false)->count(),
                'premium_users' => User::where('is_premium', true)->count(),
                'users_by_role' => [
                    'user' => User::where('role', 'user')->count(),
                    'premium' => User::where('role', 'premium')->count(),
                    'affiliate' => User::where('role', 'affiliate')->count(),
                    'vendor' => User::where('role', 'vendor')->count(),
                    'admin' => User::where('role', 'admin')->count()
                ],
                'recent_registrations' => User::where('created_at', '>=', now()->subDays(30))->count(),
                'total_referrals' => User::whereNotNull('referred_by')->count()
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
     * Upgrade user to premium
     */
    public function upgradeToPremium($id)
    {
        try {
            $user = User::findOrFail($id);
            
            $user->update([
                'is_premium' => true,
                'premium_expires_at' => now()->addYear(),
                'role' => 'premium'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User berhasil diupgrade ke premium',
                'user' => $user->makeHidden(['password', 'verification_token'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat upgrade user'
            ], 500);
        }
    }

    /**
     * Ban/Unban user
     */
    public function toggleBan($id)
    {
        try {
            $user = User::findOrFail($id);
            
            // Prevent banning admin users
            if ($user->role === 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat memblokir user admin'
                ], 403);
            }

            $user->update([
                'is_active' => !$user->is_active
            ]);

            $status = $user->is_active ? 'diaktifkan' : 'diblokir';

            return response()->json([
                'success' => true,
                'message' => "User berhasil {$status}",
                'user' => $user->makeHidden(['password', 'verification_token'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengubah status user'
            ], 500);
        }
    }

    /**
     * Reset user password (Admin only)
     */
    public function resetPassword(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'new_password' => 'required|string|min:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::findOrFail($id);
            
            $user->update([
                'password' => Hash::make($request->new_password)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Password user berhasil direset'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat reset password'
            ], 500);
        }
    }
}