<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ServiceController extends Controller
{
    /**
     * Get all services with filters
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 12);
            $search = $request->get('search', '');
            $category = $request->get('category', '');
            $minPrice = $request->get('min_price', 0);
            $maxPrice = $request->get('max_price', 0);
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $featured = $request->get('featured', false);

            $query = Service::with(['provider:id,name,avatar,rating,total_reviews'])
                          ->where('status', 'active');

            // Search filter
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('tags', 'like', "%{$search}%");
                });
            }

            // Category filter
            if ($category) {
                $query->where('category', $category);
            }

            // Price range filter
            if ($minPrice > 0) {
                $query->where('base_price', '>=', $minPrice);
            }
            if ($maxPrice > 0) {
                $query->where('base_price', '<=', $maxPrice);
            }

            // Featured filter
            if ($featured) {
                $query->where('is_featured', true);
            }

            // Sorting
            $allowedSorts = ['created_at', 'base_price', 'rating', 'orders_completed', 'views'];
            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            }

            $services = $query->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'services' => $services->items(),
                'pagination' => [
                    'current' => $services->currentPage(),
                    'pages' => $services->lastPage(),
                    'total' => $services->total(),
                    'limit' => $services->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data layanan'
            ], 500);
        }
    }

    /**
     * Get single service
     */
    public function show($slug)
    {
        try {
            $service = Service::with([
                'provider:id,name,avatar,rating,total_reviews,member_since,description',
                'provider.services:id,provider_id,title,base_price,rating,orders_completed'
            ])->where('slug', $slug)
              ->where('status', 'active')
              ->firstOrFail();

            // Increment views
            $service->increment('views');

            return response()->json([
                'success' => true,
                'service' => $service
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Create new service
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:100',
            'description' => 'required|string|max:2000',
            'category' => 'required|string|max:50',
            'tags' => 'nullable|string|max:200',
            'base_price' => 'required|numeric|min:5',
            'standard_price' => 'nullable|numeric|min:5',
            'premium_price' => 'nullable|numeric|min:5',
            'delivery_days' => 'required|integer|min:1|max:30',
            'revisions' => 'required|integer|min:0|max:10',
            'requirements' => 'nullable|string|max:1000',
            'features' => 'nullable|array',
            'images' => 'nullable|array|max:5',
            'videos' => 'nullable|array|max:2',
            'portfolio' => 'nullable|array|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $slug = $this->generateUniqueSlug($request->title);

            $service = Service::create([
                'provider_id' => auth()->id(),
                'title' => $request->title,
                'description' => $request->description,
                'slug' => $slug,
                'category' => $request->category,
                'tags' => $request->tags,
                'base_price' => $request->base_price,
                'standard_price' => $request->standard_price,
                'premium_price' => $request->premium_price,
                'pricing_type' => $this->determinePricingType($request),
                'delivery_days' => $request->delivery_days,
                'revisions' => $request->revisions,
                'requirements' => $request->requirements,
                'features' => $request->features ? json_encode($request->features) : null,
                'images' => $request->images ? json_encode($request->images) : null,
                'videos' => $request->videos ? json_encode($request->videos) : null,
                'portfolio' => $request->portfolio ? json_encode($request->portfolio) : null,
                'status' => 'pending',
                'is_available' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Layanan berhasil dibuat dan menunggu persetujuan',
                'service' => $service
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat layanan'
            ], 500);
        }
    }

    /**
     * Update service
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:100',
            'description' => 'required|string|max:2000',
            'category' => 'required|string|max:50',
            'tags' => 'nullable|string|max:200',
            'base_price' => 'required|numeric|min:5',
            'standard_price' => 'nullable|numeric|min:5',
            'premium_price' => 'nullable|numeric|min:5',
            'delivery_days' => 'required|integer|min:1|max:30',
            'revisions' => 'required|integer|min:0|max:10',
            'requirements' => 'nullable|string|max:1000',
            'features' => 'nullable|array',
            'images' => 'nullable|array|max:5',
            'videos' => 'nullable|array|max:2',
            'portfolio' => 'nullable|array|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $service = Service::where('id', $id)
                            ->where('provider_id', auth()->id())
                            ->firstOrFail();

            $updateData = [
                'title' => $request->title,
                'description' => $request->description,
                'category' => $request->category,
                'tags' => $request->tags,
                'base_price' => $request->base_price,
                'standard_price' => $request->standard_price,
                'premium_price' => $request->premium_price,
                'pricing_type' => $this->determinePricingType($request),
                'delivery_days' => $request->delivery_days,
                'revisions' => $request->revisions,
                'requirements' => $request->requirements,
                'features' => $request->features ? json_encode($request->features) : null,
                'images' => $request->images ? json_encode($request->images) : null,
                'videos' => $request->videos ? json_encode($request->videos) : null,
                'portfolio' => $request->portfolio ? json_encode($request->portfolio) : null
            ];

            // Generate new slug if title changed
            if ($service->title !== $request->title) {
                $updateData['slug'] = $this->generateUniqueSlug($request->title, $service->id);
            }

            $service->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Layanan berhasil diperbarui',
                'service' => $service
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan atau Anda bukan pemiliknya'
            ], 404);
        }
    }

    /**
     * Delete service
     */
    public function destroy($id)
    {
        try {
            $service = Service::where('id', $id)
                            ->where('provider_id', auth()->id())
                            ->firstOrFail();

            // Check if service has active orders
            if ($service->serviceOrders()->whereIn('status', ['pending', 'in_progress'])->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus layanan yang memiliki pesanan aktif'
                ], 400);
            }

            $service->delete();

            return response()->json([
                'success' => true,
                'message' => 'Layanan berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan atau Anda bukan pemiliknya'
            ], 404);
        }
    }

    /**
     * Get user's services
     */
    public function myServices(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $status = $request->get('status', '');

            $query = Service::where('provider_id', auth()->id());

            if ($status) {
                $query->where('status', $status);
            }

            $services = $query->orderBy('created_at', 'desc')
                            ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'services' => $services->items(),
                'pagination' => [
                    'current' => $services->currentPage(),
                    'pages' => $services->lastPage(),
                    'total' => $services->total(),
                    'limit' => $services->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data layanan'
            ], 500);
        }
    }

    /**
     * Get featured services
     */
    public function featured()
    {
        try {
            $services = Service::with(['provider:id,name,avatar,rating'])
                             ->where('status', 'active')
                             ->where('is_featured', true)
                             ->orderBy('rating', 'desc')
                             ->limit(8)
                             ->get();

            return response()->json([
                'success' => true,
                'services' => $services
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil layanan unggulan'
            ], 500);
        }
    }

    /**
     * Get service categories
     */
    public function categories()
    {
        try {
            $categories = Service::select('category')
                               ->where('status', 'active')
                               ->groupBy('category')
                               ->orderBy('category')
                               ->pluck('category');

            return response()->json([
                'success' => true,
                'categories' => $categories
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil kategori'
            ], 500);
        }
    }

    /**
     * Toggle service availability
     */
    public function toggleAvailability($id)
    {
        try {
            $service = Service::where('id', $id)
                            ->where('provider_id', auth()->id())
                            ->firstOrFail();

            $service->update(['is_available' => !$service->is_available]);

            return response()->json([
                'success' => true,
                'message' => 'Status ketersediaan layanan berhasil diperbarui',
                'is_available' => $service->is_available
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Generate unique slug
     */
    private function generateUniqueSlug($title, $excludeId = null)
    {
        $slug = Str::slug($title);
        $originalSlug = $slug;
        $counter = 1;

        $query = Service::where('slug', $slug);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        while ($query->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
            
            $query = Service::where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
        }

        return $slug;
    }

    /**
     * Determine pricing type based on available prices
     */
    private function determinePricingType($request)
    {
        if ($request->premium_price && $request->standard_price) {
            return 'tiered';
        } elseif ($request->standard_price) {
            return 'basic_standard';
        } else {
            return 'basic';
        }
    }
}