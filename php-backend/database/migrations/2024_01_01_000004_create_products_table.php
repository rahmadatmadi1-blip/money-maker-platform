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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seller_id');
            $table->string('title');
            $table->text('description');
            $table->text('short_description')->nullable();
            $table->string('category');
            $table->string('subcategory')->nullable();
            $table->json('tags')->nullable();
            $table->string('slug')->unique();
            
            // Pricing
            $table->decimal('price', 10, 2);
            $table->decimal('compare_price', 10, 2)->nullable();
            $table->boolean('is_digital')->default(false);
            
            // Media
            $table->json('images')->nullable();
            $table->json('videos')->nullable();
            $table->json('files')->nullable(); // For digital products
            
            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            
            // Status
            $table->enum('status', ['draft', 'active', 'inactive', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            
            // Stats
            $table->integer('views')->default(0);
            $table->integer('sales')->default(0);
            $table->decimal('revenue', 15, 2)->default(0);
            
            // Rating
            $table->decimal('rating_average', 3, 2)->default(0);
            $table->integer('rating_count')->default(0);
            
            // Pricing tiers for digital products
            $table->json('pricing_tiers')->nullable();
            
            // Digital product settings
            $table->integer('download_limit')->default(-1); // -1 = unlimited
            $table->integer('expiry_days')->default(-1); // -1 = no expiry
            
            // Features
            $table->boolean('is_featured')->default(false);
            $table->boolean('allow_reviews')->default(true);
            
            $table->timestamps();
            
            $table->foreign('seller_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['category', 'status']);
            $table->index(['is_featured', 'status']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};