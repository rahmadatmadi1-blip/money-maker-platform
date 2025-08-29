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
        Schema::create('email_campaigns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('template_id');
            $table->unsignedBigInteger('created_by');
            
            // Campaign details
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('subject');
            
            // Targeting
            $table->json('target_audience'); // user roles, segments, etc.
            $table->json('filters')->nullable(); // additional filters
            
            // Scheduling
            $table->enum('send_type', ['immediate', 'scheduled', 'recurring'])->default('immediate');
            $table->timestamp('scheduled_at')->nullable();
            $table->json('recurring_settings')->nullable(); // for recurring campaigns
            
            // Status
            $table->enum('status', ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'])->default('draft');
            
            // Statistics
            $table->integer('total_recipients')->default(0);
            $table->integer('emails_sent')->default(0);
            $table->integer('emails_delivered')->default(0);
            $table->integer('emails_opened')->default(0);
            $table->integer('emails_clicked')->default(0);
            $table->integer('emails_bounced')->default(0);
            $table->integer('unsubscribes')->default(0);
            
            // Timestamps
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            $table->timestamps();
            
            $table->foreign('template_id')->references('id')->on('email_templates')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            
            $table->index(['status', 'scheduled_at']);
            $table->index(['created_by']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_campaigns');
    }
};