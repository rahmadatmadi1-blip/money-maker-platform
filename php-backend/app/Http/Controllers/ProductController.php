<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Get all products with filters
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 12);
            $search = $request->get('search', '');
            $category = $request->get('category', '');
            $status = $request->get('status', 'active');
            $sort = $request->get('sort', 'created_at');
            $order = $request->get('order', 'desc');
            $minPrice = $request->get('min_price');
            $maxPrice = $request->get('max_price');

            $query = Product::with('seller:id,name,avatar');

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

            // Status filter
            if ($status) {
                $query->where('status', $status);
            }

            // Price range filter
            if ($minPrice) {
                $query->where('price', '>=', $minPrice);
            }
            if ($maxPrice) {
                $query->where('price', '<=', $maxPrice);
            }

            // Sorting
            $allowedSorts = ['created_at', 'price', 'title', 'views', 'sales', 'rating_average'];
            if (in_array($sort, $allowedSorts)) {
                $query->orderBy($sort, $order);
            }

            $products = $query->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'products' => $products->items(),
                'pagination' => [
                    'current' => $products->currentPage(),
                    'pages' => $products->lastPage(),
                    'total' => $products->total(),
                    'limit' => $products->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data produk'
            ], 500);
        }
    }

    /**
     * Get single product by ID or slug
     */
    public function show($identifier)
    {
        try {
            $product = Product::with(['seller:id,name,avatar,rating_average'])
                            ->where('id', $identifier)
                            ->orWhere('slug', $identifier)
                            ->firstOrFail();

            // Increment views
            $product->increment('views');

            return response()->json([
                'success' => true,
                'product' => $product
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Create new product
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'short_description' => 'nullable|string|max:150',
            'category' => 'required|string',
            'subcategory' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'compare_price' => 'nullable|numeric|min:0',
            'is_digital' => 'boolean',
            'images' => 'nullable|array',
            'videos' => 'nullable|array',
            'files' => 'nullable|array',
            'tags' => 'nullable|array',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'download_limit' => 'nullable|integer',
            'expiry_days' => 'nullable|integer'
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

            $product = Product::create([
                'seller_id' => auth()->id(),
                'title' => $request->title,
                'description' => $request->description,
                'short_description' => $request->short_description,
                'category' => $request->category,
                'subcategory' => $request->subcategory,
                'price' => $request->price,
                'compare_price' => $request->compare_price,
                'is_digital' => $request->get('is_digital', false),
                'slug' => $slug,
                'images' => $request->images,
                'videos' => $request->videos,
                'files' => $request->files,
                'tags' => $request->tags,
                'meta_title' => $request->meta_title,
                'meta_description' => $request->meta_description,
                'download_limit' => $request->get('download_limit', -1),
                'expiry_days' => $request->get('expiry_days', -1),
                'status' => 'draft'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil dibuat',
                'product' => $product
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat produk'
            ], 500);
        }
    }

    /**
     * Update product
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'short_description' => 'nullable|string|max:150',
            'category' => 'sometimes|string',
            'subcategory' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'compare_price' => 'nullable|numeric|min:0',
            'is_digital' => 'boolean',
            'images' => 'nullable|array',
            'videos' => 'nullable|array',
            'files' => 'nullable|array',
            'tags' => 'nullable|array',
            'status' => 'sometimes|in:draft,active,inactive,archived',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $product = Product::where('id', $id)
                            ->where('seller_id', auth()->id())
                            ->firstOrFail();

            // Update slug if title changed
            if ($request->has('title') && $request->title !== $product->title) {
                $request->merge(['slug' => $this->generateUniqueSlug($request->title)]);
            }

            $product->update($request->only([
                'title', 'description', 'short_description', 'category', 'subcategory',
                'price', 'compare_price', 'is_digital', 'slug', 'images', 'videos',
                'files', 'tags', 'status', 'meta_title', 'meta_description'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil diperbarui',
                'product' => $product
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan atau Anda bukan pemiliknya'
            ], 404);
        }
    }

    /**
     * Delete product
     */
    public function destroy($id)
    {
        try {
            $product = Product::where('id', $id)
                            ->where('seller_id', auth()->id())
                            ->firstOrFail();

            $product->delete();

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan atau Anda bukan pemiliknya'
            ], 404);
        }
    }

    /**
     * Get user's products
     */
    public function myProducts(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $status = $request->get('status', '');

            $query = Product::where('seller_id', auth()->id());

            if ($status) {
                $query->where('status', $status);
            }

            $products = $query->orderBy('created_at', 'desc')
                            ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'products' => $products->items(),
                'pagination' => [
                    'current' => $products->currentPage(),
                    'pages' => $products->lastPage(),
                    'total' => $products->total(),
                    'limit' => $products->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil produk Anda'
            ], 500);
        }
    }

    /**
     * Get featured products
     */
    public function featured(Request $request)
    {
        try {
            $limit = $request->get('limit', 8);

            $products = Product::with('seller:id,name,avatar')
                             ->where('status', 'active')
                             ->where('is_featured', true)
                             ->orderBy('created_at', 'desc')
                             ->limit($limit)
                             ->get();

            return response()->json([
                'success' => true,
                'products' => $products
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil produk unggulan'
            ], 500);
        }
    }

    /**
     * Get product categories
     */
    public function categories()
    {
        try {
            $categories = Product::select('category')
                               ->distinct()
                               ->where('status', 'active')
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
     * Generate unique slug
     */
    private function generateUniqueSlug($title)
    {
        $slug = Str::slug($title);
        $originalSlug = $slug;
        $counter = 1;

        while (Product::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }
}