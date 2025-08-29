<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    /**
     * Basic health check
     */
    public function basic()
    {
        try {
            $status = 'OK';
            $checks = [];
            
            // Database check
            try {
                DB::connection()->getPdo();
                $checks['database'] = [
                    'status' => 'connected',
                    'connection' => config('database.default')
                ];
            } catch (\Exception $e) {
                $status = 'DEGRADED';
                $checks['database'] = [
                    'status' => 'disconnected',
                    'error' => $e->getMessage()
                ];
            }
            
            // Redis check
            try {
                Redis::ping();
                $checks['redis'] = [
                    'status' => 'connected'
                ];
            } catch (\Exception $e) {
                $checks['redis'] = [
                    'status' => 'disconnected',
                    'error' => $e->getMessage()
                ];
            }
            
            // Cache check
            try {
                Cache::put('health_check', 'test', 1);
                $test = Cache::get('health_check');
                Cache::forget('health_check');
                
                $checks['cache'] = [
                    'status' => $test === 'test' ? 'working' : 'failed'
                ];
            } catch (\Exception $e) {
                $checks['cache'] = [
                    'status' => 'failed',
                    'error' => $e->getMessage()
                ];
            }
            
            return response()->json([
                'status' => $status,
                'message' => 'Money Maker Platform PHP API is running',
                'timestamp' => now()->toISOString(),
                'environment' => config('app.env'),
                'version' => '1.0.0',
                'checks' => $checks
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'ERROR',
                'message' => 'Health check failed',
                'timestamp' => now()->toISOString(),
                'error' => $e->getMessage()
            ], 503);
        }
    }
    
    /**
     * Detailed health check
     */
    public function detailed()
    {
        try {
            $status = 'healthy';
            $details = [];
            
            // System info
            $details['system'] = [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'server_time' => now()->toISOString(),
                'timezone' => config('app.timezone'),
                'memory_usage' => $this->formatBytes(memory_get_usage(true)),
                'memory_peak' => $this->formatBytes(memory_get_peak_usage(true)),
                'uptime' => $this->getUptime()
            ];
            
            // Database detailed check
            try {
                $dbStart = microtime(true);
                $result = DB::select('SELECT 1 as test');
                $dbTime = round((microtime(true) - $dbStart) * 1000, 2);
                
                $details['database'] = [
                    'status' => 'connected',
                    'connection' => config('database.default'),
                    'host' => config('database.connections.' . config('database.default') . '.host'),
                    'database' => config('database.connections.' . config('database.default') . '.database'),
                    'response_time_ms' => $dbTime,
                    'tables_count' => $this->getTablesCount()
                ];
            } catch (\Exception $e) {
                $status = 'degraded';
                $details['database'] = [
                    'status' => 'disconnected',
                    'error' => $e->getMessage()
                ];
            }
            
            // Redis detailed check
            try {
                $redisStart = microtime(true);
                $info = Redis::info();
                $redisTime = round((microtime(true) - $redisStart) * 1000, 2);
                
                $details['redis'] = [
                    'status' => 'connected',
                    'version' => $info['redis_version'] ?? 'unknown',
                    'response_time_ms' => $redisTime,
                    'connected_clients' => $info['connected_clients'] ?? 0,
                    'used_memory' => $this->formatBytes($info['used_memory'] ?? 0)
                ];
            } catch (\Exception $e) {
                $details['redis'] = [
                    'status' => 'disconnected',
                    'error' => $e->getMessage()
                ];
            }
            
            // Queue check
            try {
                $details['queue'] = [
                    'default_connection' => config('queue.default'),
                    'status' => 'configured'
                ];
            } catch (\Exception $e) {
                $details['queue'] = [
                    'status' => 'error',
                    'error' => $e->getMessage()
                ];
            }
            
            // Storage check
            $details['storage'] = [
                'disk_space' => $this->getDiskSpace(),
                'writable' => is_writable(storage_path()),
                'logs_writable' => is_writable(storage_path('logs'))
            ];
            
            return response()->json([
                'status' => $status,
                'message' => 'Detailed health check completed',
                'timestamp' => now()->toISOString(),
                'environment' => config('app.env'),
                'details' => $details
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Detailed health check failed',
                'timestamp' => now()->toISOString(),
                'error' => $e->getMessage()
            ], 503);
        }
    }
    
    /**
     * Format bytes to human readable format
     */
    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
    
    /**
     * Get system uptime
     */
    private function getUptime()
    {
        if (function_exists('sys_getloadavg')) {
            $uptime = shell_exec('uptime');
            return trim($uptime) ?: 'Unknown';
        }
        return 'Unknown';
    }
    
    /**
     * Get database tables count
     */
    private function getTablesCount()
    {
        try {
            $tables = DB::select('SHOW TABLES');
            return count($tables);
        } catch (\Exception $e) {
            return 0;
        }
    }
    
    /**
     * Get disk space information
     */
    private function getDiskSpace()
    {
        try {
            $path = storage_path();
            $total = disk_total_space($path);
            $free = disk_free_space($path);
            $used = $total - $free;
            
            return [
                'total' => $this->formatBytes($total),
                'used' => $this->formatBytes($used),
                'free' => $this->formatBytes($free),
                'usage_percentage' => round(($used / $total) * 100, 2)
            ];
        } catch (\Exception $e) {
            return [
                'error' => $e->getMessage()
            ];
        }
    }
}