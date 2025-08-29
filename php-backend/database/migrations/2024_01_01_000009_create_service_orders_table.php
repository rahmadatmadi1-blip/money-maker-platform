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
        Schema::create('service_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('service_id');
            $table->unsignedBigInteger('buyer_id');
            $table->unsignedBigInteger('provider_id');
            
            // Order details
            $table->string('order_number')->unique();
            $table->string('package_type')->default('basic'); // basic, standard, premium
            $table->decimal('amount', 10, 2);
            $table->json('requirements_response')->nullable();
            $table->text('special_instructions')->nullable();
            
            // Timeline
            $table->integer('delivery_days');
            $table->timestamp('delivery_date');
            $table->integer('revisions_remaining');
            
            // Status
            $table->enum('status', [
                'pending', 'requirements_pending', 'in_progress', 
                'delivered', 'revision_requested', 'completed', 
                'cancelled', 'disputed'
            ])->default('pending');
            
            // Payment
            $table->enum('payment_status', ['pending', 'paid', 'released', 'refunded'])->default('pending');
            $table->string('payment_id')->nullable();
            
            // Communication
            $table->json('messages')->nullable();
            $table->json('deliverables')->nullable();
            
            // Timestamps
            $table->timestamp('started_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            $table->foreign('service_id')->references('id')->on('services')->onDelete('cascade');
            $table->foreign('buyer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('provider_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->index(['buyer_id', 'status']);
            $table->index(['provider_id', 'status']);
            $table->index(['service_id']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_orders');
    }
};