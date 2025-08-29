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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['user', 'premium', 'affiliate', 'vendor', 'admin'])->default('user');
            $table->string('avatar')->default('https://via.placeholder.com/150x150?text=User');
            $table->string('phone')->nullable();
            
            // Address fields
            $table->string('address_street')->nullable();
            $table->string('address_city')->nullable();
            $table->string('address_state')->nullable();
            $table->string('address_zip_code')->nullable();
            $table->string('address_country')->default('Indonesia');
            
            // Premium membership
            $table->boolean('is_premium')->default(false);
            $table->timestamp('premium_expiry')->nullable();
            
            // Affiliate info
            $table->string('affiliate_id')->unique()->nullable();
            $table->string('referral_code', 8)->unique()->nullable();
            $table->unsignedBigInteger('referred_by')->nullable();
            
            // Revenue tracking
            $table->decimal('total_earnings', 15, 2)->default(0);
            $table->decimal('available_balance', 15, 2)->default(0);
            $table->decimal('pending_balance', 15, 2)->default(0);
            
            // Preferences
            $table->json('preferences')->nullable();
            
            // Account status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->string('verification_token')->nullable();
            $table->string('reset_password_token')->nullable();
            $table->timestamp('reset_password_expire')->nullable();
            
            // Login tracking
            $table->timestamp('last_login')->nullable();
            $table->integer('login_count')->default(0);
            
            // Social media links
            $table->json('social_media')->nullable();
            
            $table->rememberToken();
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('referred_by')->references('id')->on('users')->onDelete('set null');
            
            // Indexes
            $table->index(['role']);
            $table->index(['is_premium']);
            $table->index(['is_active']);
            $table->index(['is_verified']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};