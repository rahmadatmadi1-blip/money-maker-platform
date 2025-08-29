<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notification extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    protected $dates = [
        'read_at',
        'deleted_at',
    ];

    // Notification types
    const TYPE_PAYMENT_SUCCESS = 'payment_success';
    const TYPE_PAYMENT_FAILED = 'payment_failed';
    const TYPE_ORDER_STATUS = 'order_status';
    const TYPE_SERVICE_COMPLETED = 'service_completed';
    const TYPE_WELCOME = 'welcome';
    const TYPE_PASSWORD_RESET = 'password_reset';
    const TYPE_GENERAL = 'general';
    const TYPE_SYSTEM = 'system';
    const TYPE_PROMOTION = 'promotion';
    const TYPE_REMINDER = 'reminder';

    /**
     * Get the user that owns the notification
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope for read notifications
     */
    public function scopeRead($query)
    {
        return $query->where('is_read', true);
    }

    /**
     * Scope for filtering by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope for recent notifications
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Mark notification as read
     */
    public function markAsRead()
    {
        $this->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    /**
     * Mark notification as unread
     */
    public function markAsUnread()
    {
        $this->update([
            'is_read' => false,
            'read_at' => null,
        ]);
    }

    /**
     * Check if notification is read
     */
    public function isRead()
    {
        return $this->is_read;
    }

    /**
     * Check if notification is unread
     */
    public function isUnread()
    {
        return !$this->is_read;
    }

    /**
     * Get formatted created date
     */
    public function getFormattedDateAttribute()
    {
        return $this->created_at->format('M d, Y H:i');
    }

    /**
     * Get time ago
     */
    public function getTimeAgoAttribute()
    {
        return $this->created_at->diffForHumans();
    }

    /**
     * Get notification icon based on type
     */
    public function getIconAttribute()
    {
        $icons = [
            self::TYPE_PAYMENT_SUCCESS => 'check-circle',
            self::TYPE_PAYMENT_FAILED => 'x-circle',
            self::TYPE_ORDER_STATUS => 'package',
            self::TYPE_SERVICE_COMPLETED => 'check',
            self::TYPE_WELCOME => 'user-plus',
            self::TYPE_PASSWORD_RESET => 'key',
            self::TYPE_GENERAL => 'bell',
            self::TYPE_SYSTEM => 'settings',
            self::TYPE_PROMOTION => 'tag',
            self::TYPE_REMINDER => 'clock',
        ];

        return $icons[$this->type] ?? 'bell';
    }

    /**
     * Get notification color based on type
     */
    public function getColorAttribute()
    {
        $colors = [
            self::TYPE_PAYMENT_SUCCESS => 'green',
            self::TYPE_PAYMENT_FAILED => 'red',
            self::TYPE_ORDER_STATUS => 'blue',
            self::TYPE_SERVICE_COMPLETED => 'green',
            self::TYPE_WELCOME => 'purple',
            self::TYPE_PASSWORD_RESET => 'orange',
            self::TYPE_GENERAL => 'gray',
            self::TYPE_SYSTEM => 'blue',
            self::TYPE_PROMOTION => 'yellow',
            self::TYPE_REMINDER => 'orange',
        ];

        return $colors[$this->type] ?? 'gray';
    }
}