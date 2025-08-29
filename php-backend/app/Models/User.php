<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class User extends Authenticatable implements JWTSubject
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'phone',
        'address',
        'is_premium',
        'premium_expiry',
        'affiliate_id',
        'referral_code',
        'referred_by',
        'total_earnings',
        'available_balance',
        'pending_balance',
        'payment_methods',
        'preferences',
        'is_active',
        'is_verified',
        'verification_token',
        'last_login',
        'login_count',
        'social_media'
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
        'verification_token',
        'reset_password_token'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_premium' => 'boolean',
        'premium_expiry' => 'datetime',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
        'last_login' => 'datetime',
        'login_count' => 'integer',
        'total_earnings' => 'decimal:2',
        'available_balance' => 'decimal:2',
        'pending_balance' => 'decimal:2',
        'address' => 'array',
        'payment_methods' => 'array',
        'preferences' => 'array',
        'social_media' => 'array'
    ];

    /**
     * Boot method to generate referral code
     */
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($user) {
            if (empty($user->referral_code)) {
                $user->referral_code = $user->generateReferralCode();
            }
            if (empty($user->affiliate_id)) {
                $user->affiliate_id = 'AFF' . strtoupper(Str::random(8));
            }
        });
    }

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     */
    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
            'is_premium' => $this->is_premium,
            'is_verified' => $this->is_verified
        ];
    }

    /**
     * Generate unique referral code
     */
    public function generateReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (self::where('referral_code', $code)->exists());
        
        return $code;
    }

    /**
     * Add earnings to user balance
     */
    public function addEarnings(float $amount, string $type = 'pending'): void
    {
        if ($type === 'available') {
            $this->increment('available_balance', $amount);
        } else {
            $this->increment('pending_balance', $amount);
        }
        
        $this->increment('total_earnings', $amount);
    }

    /**
     * Move earnings from pending to available
     */
    public function confirmEarnings(float $amount): void
    {
        if ($this->pending_balance >= $amount) {
            $this->decrement('pending_balance', $amount);
            $this->increment('available_balance', $amount);
        }
    }

    /**
     * Check if user is premium
     */
    public function isPremiumActive(): bool
    {
        return $this->is_premium && 
               $this->premium_expiry && 
               $this->premium_expiry->isFuture();
    }

    /**
     * Get referrals relationship
     */
    public function referrals()
    {
        return $this->hasMany(User::class, 'referred_by');
    }

    /**
     * Get referrer relationship
     */
    public function referrer()
    {
        return $this->belongsTo(User::class, 'referred_by');
    }

    /**
     * Scope for active users
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for verified users
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope for premium users
     */
    public function scopePremium($query)
    {
        return $query->where('is_premium', true)
                    ->where('premium_expiry', '>', now());
    }
}