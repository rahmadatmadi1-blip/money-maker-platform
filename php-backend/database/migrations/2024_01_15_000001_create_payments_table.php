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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('order_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('service_order_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('content_purchase_id')->nullable()->constrained()->onDelete('cascade');
            
            $table->enum('payment_type', ['order', 'service', 'content']);
            $table->enum('payment_method', ['stripe', 'paypal', 'bank_transfer', 'ewallet']);
            
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->decimal('platform_fee', 10, 2)->default(0);
            $table->decimal('seller_earnings', 10, 2)->default(0);
            
            $table->enum('status', [
                'pending',
                'pending_verification',
                'processing',
                'completed',
                'failed',
                'cancelled',
                'refunded',
                'partially_refunded'
            ])->default('pending');
            
            $table->string('gateway_payment_id')->nullable();
            $table->json('gateway_response')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['user_id', 'status']);
            $table->index(['payment_type', 'status']);
            $table->index(['payment_method', 'status']);
            $table->index('gateway_payment_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};