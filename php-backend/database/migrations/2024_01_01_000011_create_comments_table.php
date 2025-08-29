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
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->morphs('commentable'); // content_id, service_id, product_id, etc.
            $table->unsignedBigInteger('parent_id')->nullable(); // For nested comments
            
            // Comment content
            $table->text('content');
            $table->json('attachments')->nullable();
            
            // Rating (for reviews)
            $table->tinyInteger('rating')->nullable(); // 1-5 stars
            
            // Status
            $table->enum('status', ['pending', 'approved', 'rejected', 'hidden'])->default('approved');
            $table->boolean('is_verified_purchase')->default(false);
            
            // Engagement
            $table->integer('likes')->default(0);
            $table->integer('dislikes')->default(0);
            $table->integer('replies_count')->default(0);
            
            // Moderation
            $table->unsignedBigInteger('moderated_by')->nullable();
            $table->timestamp('moderated_at')->nullable();
            $table->text('moderation_reason')->nullable();
            
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('comments')->onDelete('cascade');
            $table->foreign('moderated_by')->references('id')->on('users')->onDelete('set null');
            
            $table->index(['commentable_type', 'commentable_id']);
            $table->index(['user_id', 'status']);
            $table->index(['parent_id']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};