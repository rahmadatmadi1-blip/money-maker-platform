<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', $this->getAllowedOrigins($request))
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-TOKEN')
                ->header('Access-Control-Allow-Credentials', 'true')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        // Add CORS headers to the response
        $response->headers->set('Access-Control-Allow-Origin', $this->getAllowedOrigins($request));
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-TOKEN');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Expose-Headers', 'Authorization');

        return $response;
    }

    /**
     * Get allowed origins based on environment
     */
    private function getAllowedOrigins(Request $request): string
    {
        $allowedOrigins = config('cors.allowed_origins', [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
        ]);

        // In production, be more restrictive
        if (config('app.env') === 'production') {
            $allowedOrigins = config('cors.production_origins', [
                config('app.frontend_url')
            ]);
        }

        $origin = $request->header('Origin');
        
        // Check if the origin is in the allowed list
        if (in_array($origin, $allowedOrigins)) {
            return $origin;
        }

        // For development, allow localhost variations
        if (config('app.env') === 'local' && $origin) {
            if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
                return $origin;
            }
        }

        // Default to first allowed origin or wildcard for development
        return config('app.env') === 'local' ? '*' : ($allowedOrigins[0] ?? '*');
    }
}