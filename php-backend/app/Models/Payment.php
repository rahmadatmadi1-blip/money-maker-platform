<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'order_id',
        'service_order_id',
        'content_purchase_id',
        'payment_type',
        'payment_method',
        'amount',
        'currency',
        'platform_fee',
        'seller_earnings',
        'status',
        'gateway_payment_id',
        'gateway_response',
        'metadata',
        'processed_at',
        'failed_at',
        'refunded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'seller_earnings' => 'decimal:2',
        'gateway_response' => 'array',
        'metadata' => 'array',
        'processed_at' => 'datetime',
        'failed_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    protected $dates = [
        'processed_at',
        'failed_at',
        'refunded_at',
        'deleted_at',
    ];

    // Payment types
    const TYPE_ORDER = 'order';
    const TYPE_SERVICE = 'service';
    const TYPE_CONTENT = 'content';

    // Payment methods
    const METHOD_STRIPE = 'stripe';
    const METHOD_PAYPAL = 'paypal';
    const METHOD_BANK_TRANSFER = 'bank_transfer';
    const METHOD_EWALLET = 'ewallet';

    // Payment statuses
    const STATUS_PENDING = 'pending';
    const STATUS_PENDING_VERIFICATION = 'pending_verification';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_REFUNDED = 'refunded';
    const STATUS_PARTIALLY_REFUNDED = 'partially_refunded';

    /**
     * Get the user that owns the payment
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order associated with the payment
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the service order associated with the payment
     */
    public function serviceOrder()
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    /**
     * Get the content purchase associated with the payment
     */
    public function contentPurchase()
    {
        return $this->belongsTo(ContentPurchase::class);
    }

    /**
     * Scope for filtering by payment type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('payment_type', $type);
    }

    /**
     * Scope for filtering by payment method
     */
    public function scopeByMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    /**
     * Scope for filtering by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for successful payments
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope for pending payments
     */
    public function scopePending($query)
    {
        return $query->whereIn('status', [
            self::STATUS_PENDING,
            self::STATUS_PENDING_VERIFICATION,
            self::STATUS_PROCESSING
        ]);
    }

    /**
     * Check if payment is successful
     */
    public function isSuccessful()
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if payment is pending
     */
    public function isPending()
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_PENDING_VERIFICATION,
            self::STATUS_PROCESSING
        ]);
    }

    /**
     * Check if payment is failed
     */
    public function isFailed()
    {
        return in_array($this->status, [
            self::STATUS_FAILED,
            self::STATUS_CANCELLED
        ]);
    }

    /**
     * Check if payment is refunded
     */
    public function isRefunded()
    {
        return in_array($this->status, [
            self::STATUS_REFUNDED,
            self::STATUS_PARTIALLY_REFUNDED
        ]);
    }

    /**
     * Get formatted amount
     */
    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount, 2) . ' ' . strtoupper($this->currency);
    }

    /**
     * Get payment reference
     */
    public function getReferenceAttribute()
    {
        return 'PAY-' . strtoupper(substr($this->payment_type, 0, 3)) . '-' . $this->id;
    }
}