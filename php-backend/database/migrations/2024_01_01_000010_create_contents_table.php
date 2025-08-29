<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('author_id');
            
            // Content details
            $table->string('title');
            $table->text('description')->nullable();
            $table->longText('content')->nullable();
            $table->string('slug')->unique();
            
            // Content type and category
            $table->enum('type', ['article', 'video', 'course', 'ebook', 'template', 'software']);
            $table->string('category');
            $table->string('subcategory')->nullable();
            $table->json('tags')->nullable();
            
            // Pricing
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('is_free')->default(false);
            $table->boolean('is_premium_only')->default(false);
            
            // Media and files
            $table->string('featured_image')->nullable();
            $table->json('images')->nullable();
            $table->json('videos')->nullable();
            $table->json('files')->nullable();
            $table->string('preview_url')->nullable();
            
            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            
            // Status and visibility
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_featured')->default(false);
            
            // Stats
            $table->integer('views')->default(0);
            $table->integer('downloads')->default(0);
            $table->integer('purchases')->default(0);
            $table->decimal('revenue', 15, 2)->default(0);
            
            // Rating and engagement
            $table->decimal('rating_average', 3, 2)->default(0);
            $table->integer('rating_count')->default(0);
            $table->integer('likes')->default(0);
            $table->integer('comments_count')->default(0);
            
            // Content settings
            $table->boolean('allow_comments')->default(true);
            $table->boolean('allow_downloads')->default(true);
            $table->integer('download_limit')->default(-1); // -1 = unlimited
            
            // Course specific (if type is course)
            $table->integer('lessons_count')->default(0);
            $table->integer('duration_minutes')->default(0);
            $table->enum('difficulty_level', ['beginner', 'intermediate', 'advanced'])->nullable();
            
            $table->timestamps();
            
            $table->foreign('author_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['type', 'status']);
            $table->index(['category', 'status']);
            $table->index(['is_featured', 'status']);
            $table->index(['author_id', 'status']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contents');
    }
};