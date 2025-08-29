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
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('provider_id');
            
            // Service details
            $table->string('title');
            $table->text('description');
            $table->text('short_description')->nullable();
            $table->string('category');
            $table->string('subcategory')->nullable();
            $table->json('tags')->nullable();
            $table->string('slug')->unique();
            
            // Pricing
            $table->decimal('base_price', 10, 2);
            $table->json('pricing_packages')->nullable(); // Basic, Standard, Premium
            $table->enum('pricing_type', ['fixed', 'hourly', 'package'])->default('fixed');
            
            // Service details
            $table->integer('delivery_time_days');
            $table->integer('revisions_included')->default(1);
            $table->json('requirements')->nullable();
            $table->json('features')->nullable();
            
            // Media
            $table->json('images')->nullable();
            $table->json('videos')->nullable();
            $table->json('portfolio')->nullable();
            
            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            
            // Status
            $table->enum('status', ['draft', 'active', 'paused', 'inactive'])->default('draft');
            $table->boolean('is_featured')->default(false);
            
            // Stats
            $table->integer('views')->default(0);
            $table->integer('orders_completed')->default(0);
            $table->decimal('total_revenue', 15, 2)->default(0);
            
            // Rating
            $table->decimal('rating_average', 3, 2)->default(0);
            $table->integer('rating_count')->default(0);
            
            // Availability
            $table->boolean('is_available')->default(true);
            $table->integer('queue_length')->default(0);
            
            $table->timestamps();
            
            $table->foreign('provider_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['category', 'status']);
            $table->index(['is_featured', 'status']);
            $table->index(['provider_id', 'status']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};