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
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('subject');
            $table->longText('html_content');
            $table->longText('text_content')->nullable();
            
            // Template variables
            $table->json('variables')->nullable(); // Available template variables
            
            // Categorization
            $table->enum('type', [
                'welcome', 'verification', 'password_reset', 'order_confirmation',
                'payment_received', 'withdrawal_processed', 'newsletter', 'promotion',
                'notification', 'reminder', 'system'
            ]);
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system')->default(false); // System templates cannot be deleted
            
            // Design
            $table->string('preview_image')->nullable();
            $table->json('design_settings')->nullable();
            
            // Usage tracking
            $table->integer('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['type', 'is_active']);
            $table->index(['is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};