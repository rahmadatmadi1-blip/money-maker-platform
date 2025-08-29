<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceOrderController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Health Check Routes
Route::get('/health', function() {
    return response()->json(['status' => 'OK', 'timestamp' => now()]);
});

// Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
    // Protected auth routes
    Route::middleware('jwt.auth')->group(function () {
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Protected Routes
Route::middleware('jwt.auth')->group(function () {
    
    // User Management Routes (Admin only)
    Route::prefix('users')->middleware('role:admin')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::get('/statistics/overview', [UserController::class, 'statistics']);
        Route::post('/{id}/upgrade-premium', [UserController::class, 'upgradeToPremium']);
        Route::post('/{id}/toggle-ban', [UserController::class, 'toggleBan']);
        Route::post('/{id}/reset-password', [UserController::class, 'resetPassword']);
    });
    
    // Product Routes
    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index']);
        Route::get('/featured', [ProductController::class, 'featured']);
        Route::get('/categories', [ProductController::class, 'categories']);
        Route::get('/my-products', [ProductController::class, 'myProducts']);
        Route::get('/{id}', [ProductController::class, 'show']);
        Route::post('/', [ProductController::class, 'store']);
        Route::put('/{id}', [ProductController::class, 'update']);
        Route::delete('/{id}', [ProductController::class, 'destroy']);
    });
    
    // Order Routes
    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::get('/statistics', [OrderController::class, 'statistics']);
        Route::get('/{id}', [OrderController::class, 'show']);
        Route::post('/', [OrderController::class, 'store']);
        Route::put('/{id}/status', [OrderController::class, 'updateStatus']);
        Route::post('/{id}/cancel', [OrderController::class, 'cancel']);
        Route::get('/{id}/download', [OrderController::class, 'download']);
    });
    
    // Content Routes
    Route::prefix('content')->group(function () {
        Route::get('/', [ContentController::class, 'index']);
        Route::get('/featured', [ContentController::class, 'featured']);
        Route::get('/categories', [ContentController::class, 'categories']);
        Route::get('/my-content', [ContentController::class, 'myContent']);
        Route::get('/purchased', [ContentController::class, 'purchased']);
        Route::get('/{id}', [ContentController::class, 'show']);
        Route::post('/', [ContentController::class, 'store']);
        Route::put('/{id}', [ContentController::class, 'update']);
        Route::delete('/{id}', [ContentController::class, 'destroy']);
        Route::post('/{id}/purchase', [ContentController::class, 'purchase']);
        Route::get('/{id}/download', [ContentController::class, 'download']);
        Route::post('/{id}/publish', [ContentController::class, 'publish']);
    });
    
    // Service Routes
    Route::prefix('services')->group(function () {
        Route::get('/', [ServiceController::class, 'index']);
        Route::get('/featured', [ServiceController::class, 'featured']);
        Route::get('/categories', [ServiceController::class, 'categories']);
        Route::get('/my-services', [ServiceController::class, 'myServices']);
        Route::get('/{id}', [ServiceController::class, 'show']);
        Route::post('/', [ServiceController::class, 'store']);
        Route::put('/{id}', [ServiceController::class, 'update']);
        Route::delete('/{id}', [ServiceController::class, 'destroy']);
        Route::post('/{id}/toggle-availability', [ServiceController::class, 'toggleAvailability']);
    });
    
    // Service Order Routes
    Route::prefix('service-orders')->group(function () {
        Route::get('/', [ServiceOrderController::class, 'index']);
        Route::get('/statistics', [ServiceOrderController::class, 'statistics']);
        Route::get('/{id}', [ServiceOrderController::class, 'show']);
        Route::post('/', [ServiceOrderController::class, 'store']);
        Route::put('/{id}/status', [ServiceOrderController::class, 'updateStatus']);
        Route::post('/{id}/request-revision', [ServiceOrderController::class, 'requestRevision']);
        Route::post('/{id}/accept-delivery', [ServiceOrderController::class, 'acceptDelivery']);
        Route::post('/{id}/cancel', [ServiceOrderController::class, 'cancel']);
        Route::post('/{id}/message', [ServiceOrderController::class, 'sendMessage']);
    });
    
    // Analytics Routes
    Route::prefix('analytics')->group(function () {
        Route::get('/dashboard', [AnalyticsController::class, 'dashboard']);
        Route::get('/revenue', [AnalyticsController::class, 'revenue']);
        Route::get('/traffic', [AnalyticsController::class, 'traffic']);
        Route::get('/user-activity', [AnalyticsController::class, 'userActivity']);
        Route::get('/conversion', [AnalyticsController::class, 'conversion']);
        Route::get('/export', [AnalyticsController::class, 'export']);
    });
    
    // Payment Routes
    Route::prefix('payments')->group(function () {
        Route::get('/', [PaymentController::class, 'index']);
        Route::get('/methods', [PaymentController::class, 'getPaymentMethods']);
        Route::get('/statistics', [PaymentController::class, 'statistics']);
        Route::get('/{id}', [PaymentController::class, 'show']);
        Route::post('/order', [PaymentController::class, 'processOrderPayment']);
        Route::post('/service', [PaymentController::class, 'processServicePayment']);
        Route::post('/content', [PaymentController::class, 'processContentPayment']);
        Route::post('/{id}/confirm', [PaymentController::class, 'confirmManualPayment']);
    });

    // Payment Webhook Routes (outside auth middleware)
});

// Public Payment Webhook Routes
Route::prefix('webhooks')->group(function () {
    Route::post('/stripe', [PaymentController::class, 'stripeWebhook']);
    Route::post('/paypal', [PaymentController::class, 'paypalWebhook']);
});

// Public Routes for Payment Returns
Route::prefix('payment')->group(function () {
    Route::get('/paypal/success', function(Request $request) {
        return redirect(config('app.frontend_url') . '/payment/success?' . http_build_query($request->all()));
    });
    Route::get('/paypal/cancel', function(Request $request) {
        return redirect(config('app.frontend_url') . '/payment/cancel?' . http_build_query($request->all()));
    });
    
    // Withdrawal Routes
    Route::prefix('withdrawals')->group(function () {
        Route::get('/', [WithdrawalController::class, 'index']);
        Route::get('/balance', [WithdrawalController::class, 'balance']);
        Route::get('/statistics', [WithdrawalController::class, 'statistics']);
        Route::get('/{id}', [WithdrawalController::class, 'show']);
        Route::post('/', [WithdrawalController::class, 'store']);
        Route::delete('/{id}', [WithdrawalController::class, 'cancel']);
    });
    
    // Notification Routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::put('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
        Route::get('/settings', [NotificationController::class, 'getSettings']);
        Route::put('/settings', [NotificationController::class, 'updateSettings']);
    });
    
    // Admin Routes
    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/config', [AdminController::class, 'getConfig']);
        Route::put('/config', [AdminController::class, 'updateConfig']);
        Route::get('/logs', [AdminController::class, 'getLogs']);
        Route::post('/clear-cache', [AdminController::class, 'clearCache']);
        Route::post('/optimize-database', [AdminController::class, 'optimizeDatabase']);
        Route::get('/database-stats', [AdminController::class, 'getDatabaseStats']);
        Route::post('/backup-database', [AdminController::class, 'backupDatabase']);
        Route::get('/system-info', [AdminController::class, 'getSystemInfo']);
        Route::post('/test-notification', [AdminController::class, 'sendTestNotification']);
        
        // Admin Withdrawal Management
        Route::prefix('withdrawals')->group(function () {
            Route::get('/', [WithdrawalController::class, 'adminIndex']);
            Route::put('/{id}/process', [WithdrawalController::class, 'adminProcess']);
            Route::get('/statistics', [WithdrawalController::class, 'adminStatistics']);
        });
        
        // Admin Email Templates
        Route::prefix('email-templates')->group(function () {
            Route::get('/', [NotificationController::class, 'getEmailTemplates']);
            Route::post('/', [NotificationController::class, 'createEmailTemplate']);
            Route::put('/{id}', [NotificationController::class, 'updateEmailTemplate']);
            Route::delete('/{id}', [NotificationController::class, 'deleteEmailTemplate']);
        });
        
        // Admin Email Campaigns
        Route::prefix('email-campaigns')->group(function () {
            Route::get('/', [NotificationController::class, 'getEmailCampaigns']);
            Route::post('/', [NotificationController::class, 'createEmailCampaign']);
        });
    });
});

// Public Routes (no authentication required)
Route::prefix('public')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/featured', [ProductController::class, 'featured']);
    Route::get('/products/categories', [ProductController::class, 'categories']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    
    Route::get('/content', [ContentController::class, 'index']);
    Route::get('/content/featured', [ContentController::class, 'featured']);
    Route::get('/content/categories', [ContentController::class, 'categories']);
    Route::get('/content/{id}', [ContentController::class, 'show']);
    
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/services/featured', [ServiceController::class, 'featured']);
    Route::get('/services/categories', [ServiceController::class, 'categories']);
    Route::get('/services/{id}', [ServiceController::class, 'show']);
});

// Fallback route for undefined endpoints
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'Endpoint not found'
    ], 404);
});