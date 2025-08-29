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
        Schema::create('content_purchases', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('content_id');
            $table->unsignedBigInteger('order_id')->nullable();
            
            // Purchase details
            $table->decimal('amount_paid', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('payment_method', ['stripe', 'paypal', 'credits', 'free']);
            
            // Access control
            $table->integer('downloads_remaining')->nullable();
            $table->timestamp('access_expires_at')->nullable();
            $table->boolean('has_lifetime_access')->default(false);
            
            // Usage tracking
            $table->integer('download_count')->default(0);
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamp('first_downloaded_at')->nullable();
            
            // Status
            $table->enum('status', ['active', 'expired', 'revoked'])->default('active');
            
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('content_id')->references('id')->on('contents')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');
            
            $table->unique(['user_id', 'content_id']); // Prevent duplicate purchases
            $table->index(['user_id', 'status']);
            $table->index(['content_id']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_purchases');
    }
};