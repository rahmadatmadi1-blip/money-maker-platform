<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Product;
use App\Models\Service;
use App\Models\Order;
use App\Models\ServiceOrder;
use App\Models\Content;
use App\Models\Payment;
use App\Models\Withdrawal;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.'
                ], 403);
            }
            return $next($request);
        });
    }

    /**
     * Get dashboard statistics
     */
    public function dashboard()
    {
        try {
            $stats = [
                'users' => [
                    'total' => User::count(),
                    'active' => User::where('is_active', true)->count(),
                    'premium' => User::where('is_premium', true)->count(),
                    'new_this_month' => User::where('created_at', '>=', now()->startOfMonth())->count()
                ],
                'products' => [
                    'total' => Product::count(),
                    'active' => Product::where('status', 'active')->count(),
                    'pending' => Product::where('status', 'pending')->count(),
                    'digital' => Product::where('type', 'digital')->count()
                ],
                'services' => [
                    'total' => Service::count(),
                    'active' => Service::where('status', 'active')->count(),
                    'pending' => Service::where('status', 'pending')->count(),
                    'available' => Service::where('is_available', true)->count()
                ],
                'orders' => [
                    'total' => Order::count(),
                    'pending' => Order::where('status', 'pending')->count(),
                    'completed' => Order::where('status', 'completed')->count(),
                    'this_month' => Order::where('created_at', '>=', now()->startOfMonth())->count()
                ],
                'service_orders' => [
                    'total' => ServiceOrder::count(),
                    'active' => ServiceOrder::whereIn('status', ['in_progress', 'revision_requested'])->count(),
                    'completed' => ServiceOrder::where('status', 'completed')->count(),
                    'this_month' => ServiceOrder::where('created_at', '>=', now()->startOfMonth())->count()
                ],
                'content' => [
                    'total' => Content::count(),
                    'published' => Content::where('status', 'published')->count(),
                    'draft' => Content::where('status', 'draft')->count(),
                    'free' => Content::where('price', 0)->count()
                ],
                'payments' => [
                    'total_amount' => Payment::where('status', 'completed')->sum('amount'),
                    'total_count' => Payment::where('status', 'completed')->count(),
                    'pending_amount' => Payment::where('status', 'pending')->sum('amount'),
                    'this_month_amount' => Payment::where('status', 'completed')
                                                 ->where('created_at', '>=', now()->startOfMonth())
                                                 ->sum('amount')
                ],
                'withdrawals' => [
                    'total_amount' => Withdrawal::where('status', 'completed')->sum('net_amount'),
                    'pending_count' => Withdrawal::where('status', 'pending')->count(),
                    'pending_amount' => Withdrawal::where('status', 'pending')->sum('amount'),
                    'total_fees' => Withdrawal::where('status', 'completed')->sum('fee_amount')
                ]
            ];

            // Recent activities
            $recentActivities = [
                'new_users' => User::latest()->take(5)->get(['id', 'name', 'email', 'created_at']),
                'recent_orders' => Order::with('user:id,name', 'product:id,title')
                                       ->latest()
                                       ->take(5)
                                       ->get(['id', 'order_number', 'user_id', 'product_id', 'total_amount', 'status', 'created_at']),
                'pending_withdrawals' => Withdrawal::with('user:id,name,email')
                                                  ->where('status', 'pending')
                                                  ->latest()
                                                  ->take(5)
                                                  ->get(['id', 'user_id', 'amount', 'created_at'])
            ];

            return response()->json([
                'success' => true,
                'statistics' => $stats,
                'recent_activities' => $recentActivities
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data dashboard'
            ], 500);
        }
    }

    /**
     * Get system configuration
     */
    public function getConfig()
    {
        try {
            $config = [
                'site_settings' => [
                    'site_name' => config('app.name'),
                    'site_url' => config('app.url'),
                    'maintenance_mode' => app()->isDownForMaintenance(),
                    'registration_enabled' => config('app.registration_enabled', true),
                    'email_verification_required' => config('app.email_verification_required', true)
                ],
                'payment_settings' => [
                    'stripe_enabled' => !empty(config('services.stripe.key')),
                    'paypal_enabled' => !empty(config('services.paypal.client_id')),
                    'commission_rate' => config('app.commission_rate', 10),
                    'minimum_withdrawal' => config('app.minimum_withdrawal', 10)
                ],
                'email_settings' => [
                    'mail_driver' => config('mail.default'),
                    'smtp_configured' => config('mail.mailers.smtp.host') !== null,
                    'from_address' => config('mail.from.address'),
                    'from_name' => config('mail.from.name')
                ],
                'storage_settings' => [
                    'default_disk' => config('filesystems.default'),
                    'cloud_storage' => config('filesystems.cloud'),
                    'max_upload_size' => ini_get('upload_max_filesize')
                ]
            ];

            return response()->json([
                'success' => true,
                'config' => $config
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil konfigurasi sistem'
            ], 500);
        }
    }

    /**
     * Update system configuration
     */
    public function updateConfig(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'site_name' => 'nullable|string|max:255',
            'registration_enabled' => 'nullable|boolean',
            'email_verification_required' => 'nullable|boolean',
            'commission_rate' => 'nullable|numeric|min:0|max:50',
            'minimum_withdrawal' => 'nullable|numeric|min:1',
            'maintenance_mode' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Update configuration values
            // Note: In a real application, you would store these in a database
            // or update configuration files appropriately
            
            if ($request->has('maintenance_mode')) {
                if ($request->maintenance_mode) {
                    Artisan::call('down');
                } else {
                    Artisan::call('up');
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Konfigurasi sistem berhasil diperbarui'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui konfigurasi'
            ], 500);
        }
    }

    /**
     * Get system logs
     */
    public function getLogs(Request $request)
    {
        try {
            $type = $request->get('type', 'laravel');
            $lines = $request->get('lines', 100);

            $logPath = storage_path('logs/');
            $logFile = '';

            switch ($type) {
                case 'laravel':
                    $logFile = $logPath . 'laravel.log';
                    break;
                case 'error':
                    $logFile = $logPath . 'error.log';
                    break;
                case 'access':
                    $logFile = $logPath . 'access.log';
                    break;
                default:
                    $logFile = $logPath . 'laravel.log';
            }

            if (!file_exists($logFile)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File log tidak ditemukan'
                ], 404);
            }

            $logs = [];
            $file = new \SplFileObject($logFile);
            $file->seek(PHP_INT_MAX);
            $totalLines = $file->key();
            $startLine = max(0, $totalLines - $lines);

            $file->seek($startLine);
            while (!$file->eof()) {
                $line = trim($file->current());
                if (!empty($line)) {
                    $logs[] = $line;
                }
                $file->next();
            }

            return response()->json([
                'success' => true,
                'logs' => array_reverse($logs),
                'total_lines' => $totalLines
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil log sistem'
            ], 500);
        }
    }

    /**
     * Clear system cache
     */
    public function clearCache(Request $request)
    {
        try {
            $type = $request->get('type', 'all');

            switch ($type) {
                case 'config':
                    Artisan::call('config:clear');
                    break;
                case 'route':
                    Artisan::call('route:clear');
                    break;
                case 'view':
                    Artisan::call('view:clear');
                    break;
                case 'cache':
                    Artisan::call('cache:clear');
                    break;
                case 'all':
                default:
                    Artisan::call('config:clear');
                    Artisan::call('route:clear');
                    Artisan::call('view:clear');
                    Artisan::call('cache:clear');
                    break;
            }

            return response()->json([
                'success' => true,
                'message' => 'Cache berhasil dibersihkan'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membersihkan cache'
            ], 500);
        }
    }

    /**
     * Optimize database
     */
    public function optimizeDatabase()
    {
        try {
            // Get all table names
            $tables = DB::select('SHOW TABLES');
            $optimizedTables = [];

            foreach ($tables as $table) {
                $tableName = array_values((array) $table)[0];
                DB::statement("OPTIMIZE TABLE `{$tableName}`");
                $optimizedTables[] = $tableName;
            }

            return response()->json([
                'success' => true,
                'message' => 'Database berhasil dioptimalkan',
                'optimized_tables' => $optimizedTables
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengoptimalkan database'
            ], 500);
        }
    }

    /**
     * Get database statistics
     */
    public function getDatabaseStats()
    {
        try {
            $stats = [];

            // Get table sizes
            $tables = DB::select("
                SELECT 
                    table_name AS 'table',
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb',
                    table_rows AS 'rows'
                FROM information_schema.TABLES 
                WHERE table_schema = DATABASE()
                ORDER BY (data_length + index_length) DESC
            ");

            $totalSize = 0;
            $totalRows = 0;

            foreach ($tables as $table) {
                $totalSize += $table->size_mb;
                $totalRows += $table->rows;
            }

            $stats = [
                'total_size_mb' => round($totalSize, 2),
                'total_rows' => $totalRows,
                'total_tables' => count($tables),
                'tables' => $tables
            ];

            return response()->json([
                'success' => true,
                'database_stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil statistik database'
            ], 500);
        }
    }

    /**
     * Run database backup
     */
    public function backupDatabase()
    {
        try {
            $filename = 'backup_' . date('Y-m-d_H-i-s') . '.sql';
            $backupPath = storage_path('app/backups/');
            
            // Create backup directory if it doesn't exist
            if (!file_exists($backupPath)) {
                mkdir($backupPath, 0755, true);
            }

            // Run mysqldump command
            $command = sprintf(
                'mysqldump -h%s -u%s -p%s %s > %s',
                config('database.connections.mysql.host'),
                config('database.connections.mysql.username'),
                config('database.connections.mysql.password'),
                config('database.connections.mysql.database'),
                $backupPath . $filename
            );

            exec($command, $output, $returnCode);

            if ($returnCode === 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Backup database berhasil dibuat',
                    'filename' => $filename,
                    'path' => $backupPath . $filename
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal membuat backup database'
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat backup database'
            ], 500);
        }
    }

    /**
     * Get system information
     */
    public function getSystemInfo()
    {
        try {
            $info = [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                'database_version' => DB::select('SELECT VERSION() as version')[0]->version,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
                'timezone' => config('app.timezone'),
                'environment' => config('app.env'),
                'debug_mode' => config('app.debug'),
                'disk_space' => [
                    'free' => disk_free_space('/'),
                    'total' => disk_total_space('/')
                ]
            ];

            return response()->json([
                'success' => true,
                'system_info' => $info
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil informasi sistem'
            ], 500);
        }
    }

    /**
     * Send test notification
     */
    public function sendTestNotification(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|string|in:email,push,database',
            'recipient_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::findOrFail($request->recipient_id);

            if ($request->type === 'database') {
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'system_test',
                    'title' => $request->title,
                    'message' => $request->message,
                    'data' => ['test' => true],
                    'is_read' => false
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Notifikasi test berhasil dikirim'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengirim notifikasi test'
            ], 500);
        }
    }
}