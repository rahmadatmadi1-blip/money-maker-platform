<?php

namespace App\Http\Controllers;

use App\Models\Content;
use App\Models\ContentPurchase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ContentController extends Controller
{
    /**
     * Get all content with filters
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 12);
            $search = $request->get('search', '');
            $type = $request->get('type', '');
            $category = $request->get('category', '');
            $minPrice = $request->get('min_price', 0);
            $maxPrice = $request->get('max_price', 0);
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $featured = $request->get('featured', false);
            $free = $request->get('free', false);

            $query = Content::with(['author:id,name,avatar,rating,total_reviews'])
                          ->where('status', 'published');

            // Search filter
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('tags', 'like', "%{$search}%");
                });
            }

            // Type filter
            if ($type) {
                $query->where('type', $type);
            }

            // Category filter
            if ($category) {
                $query->where('category', $category);
            }

            // Price filters
            if ($free) {
                $query->where('price', 0);
            } else {
                if ($minPrice > 0) {
                    $query->where('price', '>=', $minPrice);
                }
                if ($maxPrice > 0) {
                    $query->where('price', '<=', $maxPrice);
                }
            }

            // Featured filter
            if ($featured) {
                $query->where('is_featured', true);
            }

            // Sorting
            $allowedSorts = ['created_at', 'price', 'rating', 'views', 'downloads', 'purchases'];
            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            }

            $contents = $query->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'contents' => $contents->items(),
                'pagination' => [
                    'current' => $contents->currentPage(),
                    'pages' => $contents->lastPage(),
                    'total' => $contents->total(),
                    'limit' => $contents->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data konten'
            ], 500);
        }
    }

    /**
     * Get single content
     */
    public function show($slug)
    {
        try {
            $content = Content::with([
                'author:id,name,avatar,rating,total_reviews,member_since,description',
                'author.contents:id,author_id,title,price,rating,purchases'
            ])->where('slug', $slug)
              ->where('status', 'published')
              ->firstOrFail();

            // Increment views
            $content->increment('views');

            // Check if user has purchased this content
            $hasPurchased = false;
            if (auth()->check()) {
                $hasPurchased = ContentPurchase::where('user_id', auth()->id())
                                             ->where('content_id', $content->id)
                                             ->where('status', 'active')
                                             ->exists();
            }

            $content->has_purchased = $hasPurchased;

            return response()->json([
                'success' => true,
                'content' => $content
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Konten tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Create new content
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:200',
            'description' => 'required|string|max:2000',
            'type' => 'required|in:article,video,course,ebook,template,audio,software',
            'category' => 'required|string|max:50',
            'tags' => 'nullable|string|max:200',
            'price' => 'required|numeric|min:0',
            'images' => 'nullable|array|max:5',
            'videos' => 'nullable|array|max:3',
            'files' => 'nullable|array|max:10',
            'content_body' => 'nullable|string',
            'allow_comments' => 'boolean',
            'allow_downloads' => 'boolean',
            'course_duration' => 'nullable|integer|min:1',
            'course_lessons' => 'nullable|integer|min:1',
            'course_level' => 'nullable|in:beginner,intermediate,advanced'
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

            $content = Content::create([
                'author_id' => auth()->id(),
                'title' => $request->title,
                'description' => $request->description,
                'slug' => $slug,
                'type' => $request->type,
                'category' => $request->category,
                'tags' => $request->tags,
                'price' => $request->price,
                'images' => $request->images ? json_encode($request->images) : null,
                'videos' => $request->videos ? json_encode($request->videos) : null,
                'files' => $request->files ? json_encode($request->files) : null,
                'content_body' => $request->content_body,
                'allow_comments' => $request->get('allow_comments', true),
                'allow_downloads' => $request->get('allow_downloads', true),
                'course_duration' => $request->course_duration,
                'course_lessons' => $request->course_lessons,
                'course_level' => $request->course_level,
                'status' => 'draft'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Konten berhasil dibuat',
                'content' => $content
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat konten'
            ], 500);
        }
    }

    /**
     * Update content
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:200',
            'description' => 'required|string|max:2000',
            'type' => 'required|in:article,video,course,ebook,template,audio,software',
            'category' => 'required|string|max:50',
            'tags' => 'nullable|string|max:200',
            'price' => 'required|numeric|min:0',
            'images' => 'nullable|array|max:5',
            'videos' => 'nullable|array|max:3',
            'files' => 'nullable|array|max:10',
            'content_body' => 'nullable|string',
            'allow_comments' => 'boolean',
            'allow_downloads' => 'boolean',
            'course_duration' => 'nullable|integer|min:1',
            'course_lessons' => 'nullable|integer|min:1',
            'course_level' => 'nullable|in:beginner,intermediate,advanced'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $content = Content::where('id', $id)
                            ->where('author_id', auth()->id())
                            ->firstOrFail();

            $updateData = [
                'title' => $request->title,
                'description' => $request->description,
                'type' => $request->type,
                'category' => $request->category,
                'tags' => $request->tags,
                'price' => $request->price,
                'images' => $request->images ? json_encode($request->images) : null,
                'videos' => $request->videos ? json_encode($request->videos) : null,
                'files' => $request->files ? json_encode($request->files) : null,
                'content_body' => $request->content_body,
                'allow_comments' => $request->get('allow_comments', true),
                'allow_downloads' => $request->get('allow_downloads', true),
                'course_duration' => $request->course_duration,
                'course_lessons' => $request->course_lessons,
                'course_level' => $request->course_level
            ];

            // Generate new slug if title changed
            if ($content->title !== $request->title) {
                $updateData['slug'] = $this->generateUniqueSlug($request->title, $content->id);
            }

            $content->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Konten berhasil diperbarui',
                'content' => $content
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Konten tidak ditemukan atau Anda bukan penulisnya'
            ], 404);
        }
    }

    /**
     * Delete content
     */
    public function destroy($id)
    {
        try {
            $content = Content::where('id', $id)
                            ->where('author_id', auth()->id())
                            ->firstOrFail();

            // Check if content has active purchases
            if ($content->contentPurchases()->where('status', 'active')->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus konten yang sudah dibeli pengguna'
                ], 400);
            }

            $content->delete();

            return response()->json([
                'success' => true,
                'message' => 'Konten berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Konten tidak ditemukan atau Anda bukan penulisnya'
            ], 404);
        }
    }

    /**
     * Get user's content
     */
    public function myContent(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $status = $request->get('status', '');
            $type = $request->get('type', '');

            $query = Content::where('author_id', auth()->id());

            if ($status) {
                $query->where('status', $status);
            }

            if ($type) {
                $query->where('type', $type);
            }

            $contents = $query->orderBy('created_at', 'desc')
                            ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'contents' => $contents->items(),
                'pagination' => [
                    'current' => $contents->currentPage(),
                    'pages' => $contents->lastPage(),
                    'total' => $contents->total(),
                    'limit' => $contents->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data konten'
            ], 500);
        }
    }

    /**
     * Get purchased content
     */
    public function purchased(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            $type = $request->get('type', '');

            $query = ContentPurchase::with(['content:id,title,description,type,category,images,price,author_id'])
                                  ->where('user_id', auth()->id())
                                  ->where('status', 'active');

            if ($type) {
                $query->whereHas('content', function($q) use ($type) {
                    $q->where('type', $type);
                });
            }

            $purchases = $query->orderBy('created_at', 'desc')
                             ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'purchases' => $purchases->items(),
                'pagination' => [
                    'current' => $purchases->currentPage(),
                    'pages' => $purchases->lastPage(),
                    'total' => $purchases->total(),
                    'limit' => $purchases->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil konten yang dibeli'
            ], 500);
        }
    }

    /**
     * Purchase content
     */
    public function purchase(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
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
            $content = Content::where('id', $id)
                            ->where('status', 'published')
                            ->firstOrFail();

            // Check if user is trying to buy their own content
            if ($content->author_id === auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak dapat membeli konten sendiri'
                ], 400);
            }

            // Check if already purchased
            $existingPurchase = ContentPurchase::where('user_id', auth()->id())
                                             ->where('content_id', $content->id)
                                             ->where('status', 'active')
                                             ->first();

            if ($existingPurchase) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah membeli konten ini'
                ], 400);
            }

            // Free content
            if ($content->price == 0) {
                $purchase = ContentPurchase::create([
                    'user_id' => auth()->id(),
                    'content_id' => $content->id,
                    'amount' => 0,
                    'currency' => 'USD',
                    'payment_method' => 'free',
                    'status' => 'active',
                    'lifetime_access' => true
                ]);

                // Update content statistics
                $content->increment('purchases');
                $content->increment('downloads');

                return response()->json([
                    'success' => true,
                    'message' => 'Konten gratis berhasil ditambahkan ke koleksi Anda',
                    'purchase' => $purchase
                ]);
            }

            // Paid content - create purchase record
            $purchase = ContentPurchase::create([
                'user_id' => auth()->id(),
                'content_id' => $content->id,
                'amount' => $content->price,
                'currency' => 'USD',
                'payment_method' => $request->payment_method,
                'status' => 'pending',
                'lifetime_access' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pembelian konten berhasil dibuat',
                'purchase' => $purchase->load('content:id,title,price')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membeli konten'
            ], 500);
        }
    }

    /**
     * Download content
     */
    public function download($id)
    {
        try {
            $content = Content::findOrFail($id);

            // Check if user has access to this content
            $hasAccess = false;
            
            if ($content->price == 0) {
                $hasAccess = true;
            } elseif (auth()->check()) {
                $purchase = ContentPurchase::where('user_id', auth()->id())
                                         ->where('content_id', $content->id)
                                         ->where('status', 'active')
                                         ->first();

                if ($purchase) {
                    // Check access expiry
                    if ($purchase->lifetime_access || !$purchase->access_expires_at || $purchase->access_expires_at > now()) {
                        // Check download limit
                        if ($purchase->downloads_remaining === null || $purchase->downloads_remaining > 0) {
                            $hasAccess = true;
                            
                            // Decrement download count
                            if ($purchase->downloads_remaining !== null) {
                                $purchase->decrement('downloads_remaining');
                            }
                            
                            // Update usage tracking
                            $purchase->update([
                                'download_count' => $purchase->download_count + 1,
                                'last_accessed_at' => now(),
                                'first_downloaded_at' => $purchase->first_downloaded_at ?? now()
                            ]);
                        }
                    }
                }
            }

            if (!$hasAccess) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses untuk mengunduh konten ini'
                ], 403);
            }

            // Increment content download count
            $content->increment('downloads');

            return response()->json([
                'success' => true,
                'message' => 'Download berhasil',
                'files' => $content->files ? json_decode($content->files) : [],
                'content_body' => $content->content_body
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Konten tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Get featured content
     */
    public function featured()
    {
        try {
            $contents = Content::with(['author:id,name,avatar,rating'])
                             ->where('status', 'published')
                             ->where('is_featured', true)
                             ->orderBy('rating', 'desc')
                             ->limit(8)
                             ->get();

            return response()->json([
                'success' => true,
                'contents' => $contents
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil konten unggulan'
            ], 500);
        }
    }

    /**
     * Get content categories
     */
    public function categories()
    {
        try {
            $categories = Content::select('category')
                               ->where('status', 'published')
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
     * Publish content
     */
    public function publish($id)
    {
        try {
            $content = Content::where('id', $id)
                            ->where('author_id', auth()->id())
                            ->firstOrFail();

            $content->update([
                'status' => 'published',
                'published_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Konten berhasil dipublikasikan'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Konten tidak ditemukan'
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

        $query = Content::where('slug', $slug);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        while ($query->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
            
            $query = Content::where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
        }

        return $slug;
    }
}