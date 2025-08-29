<?php

namespace App\Services;

use App\Models\User;
use App\Models\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Exception;

class NotificationService
{
    /**
     * Send notification to user
     */
    public function sendNotification($userId, $type, $title, $message, $data = [])
    {
        try {
            $notification = Notification::create([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => $data,
                'is_read' => false,
            ]);

            // Send push notification if enabled
            if (config('notification.push_enabled')) {
                $this->sendPushNotification($userId, $title, $message, $data);
            }

            // Send email notification for important types
            if (in_array($type, ['payment_success', 'payment_failed', 'order_status', 'service_completed'])) {
                $this->sendEmailNotification($userId, $type, $title, $message, $data);
            }

            return $notification;
        } catch (Exception $e) {
            Log::error('Failed to send notification', [
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Send email notification
     */
    public function sendEmailNotification($userId, $type, $title, $message, $data = [])
    {
        try {
            $user = User::find($userId);
            if (!$user || !$user->email) {
                return false;
            }

            $emailData = [
                'user' => $user,
                'title' => $title,
                'message' => $message,
                'data' => $data,
                'type' => $type
            ];

            switch ($type) {
                case 'payment_success':
                    Mail::send('emails.payment-success', $emailData, function ($mail) use ($user, $title) {
                        $mail->to($user->email, $user->name)
                             ->subject($title);
                    });
                    break;

                case 'payment_failed':
                    Mail::send('emails.payment-failed', $emailData, function ($mail) use ($user, $title) {
                        $mail->to($user->email, $user->name)
                             ->subject($title);
                    });
                    break;

                case 'order_status':
                    Mail::send('emails.order-status', $emailData, function ($mail) use ($user, $title) {
                        $mail->to($user->email, $user->name)
                             ->subject($title);
                    });
                    break;

                case 'service_completed':
                    Mail::send('emails.service-completed', $emailData, function ($mail) use ($user, $title) {
                        $mail->to($user->email, $user->name)
                             ->subject($title);
                    });
                    break;

                case 'welcome':
                    Mail::send('emails.welcome', $emailData, function ($mail) use ($user, $title) {
                        $mail->to($user->email, $user->name)
                             ->subject($title);
                    });
                    break;

                case 'password_reset':
                    Mail::send('emails.password-reset', $emailData, function ($mail) use ($user, $title) {
                        $mail->to($user->email, $user->name)
                             ->subject($title);
                    });
                    break;

                default:
                    Mail::send('emails.general', $emailData, function ($mail) use ($user, $title) {
                        $mail->to($user->email, $user->name)
                             ->subject($title);
                    });
                    break;
            }

            Log::info('Email notification sent', [
                'user_id' => $userId,
                'type' => $type,
                'email' => $user->email
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Failed to send email notification', [
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send push notification
     */
    public function sendPushNotification($userId, $title, $message, $data = [])
    {
        try {
            $user = User::find($userId);
            if (!$user || !$user->fcm_token) {
                return false;
            }

            $fcmData = [
                'to' => $user->fcm_token,
                'notification' => [
                    'title' => $title,
                    'body' => $message,
                    'icon' => config('app.url') . '/images/notification-icon.png',
                    'click_action' => config('app.frontend_url')
                ],
                'data' => array_merge($data, [
                    'user_id' => $userId,
                    'timestamp' => now()->toISOString()
                ])
            ];

            $headers = [
                'Authorization: key=' . config('notification.fcm_server_key'),
                'Content-Type: application/json'
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'https://fcm.googleapis.com/fcm/send');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fcmData));

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                Log::info('Push notification sent', [
                    'user_id' => $userId,
                    'title' => $title
                ]);
                return true;
            } else {
                Log::error('Failed to send push notification', [
                    'user_id' => $userId,
                    'http_code' => $httpCode,
                    'response' => $response
                ]);
                return false;
            }
        } catch (Exception $e) {
            Log::error('Push notification error', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send bulk notifications
     */
    public function sendBulkNotifications($userIds, $type, $title, $message, $data = [])
    {
        $results = [];
        
        foreach ($userIds as $userId) {
            try {
                $notification = $this->sendNotification($userId, $type, $title, $message, $data);
                $results[$userId] = ['success' => true, 'notification_id' => $notification->id];
            } catch (Exception $e) {
                $results[$userId] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }

    /**
     * Mark notification as read
     */
    public function markAsRead($notificationId, $userId)
    {
        return Notification::where('id', $notificationId)
            ->where('user_id', $userId)
            ->update(['is_read' => true, 'read_at' => now()]);
    }

    /**
     * Mark all notifications as read for user
     */
    public function markAllAsRead($userId)
    {
        return Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);
    }

    /**
     * Get user notifications
     */
    public function getUserNotifications($userId, $limit = 20, $offset = 0)
    {
        return Notification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->offset($offset)
            ->get();
    }

    /**
     * Get unread notifications count
     */
    public function getUnreadCount($userId)
    {
        return Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    /**
     * Delete old notifications
     */
    public function deleteOldNotifications($days = 30)
    {
        return Notification::where('created_at', '<', now()->subDays($days))
            ->delete();
    }

    /**
     * Send payment success notification
     */
    public function sendPaymentSuccessNotification($userId, $paymentData)
    {
        $title = 'Payment Successful';
        $message = "Your payment of {$paymentData['amount']} {$paymentData['currency']} has been processed successfully.";
        
        return $this->sendNotification($userId, 'payment_success', $title, $message, $paymentData);
    }

    /**
     * Send payment failed notification
     */
    public function sendPaymentFailedNotification($userId, $paymentData)
    {
        $title = 'Payment Failed';
        $message = "Your payment of {$paymentData['amount']} {$paymentData['currency']} could not be processed. Please try again.";
        
        return $this->sendNotification($userId, 'payment_failed', $title, $message, $paymentData);
    }

    /**
     * Send order status notification
     */
    public function sendOrderStatusNotification($userId, $orderData)
    {
        $title = 'Order Status Update';
        $message = "Your order #{$orderData['order_id']} status has been updated to {$orderData['status']}.";
        
        return $this->sendNotification($userId, 'order_status', $title, $message, $orderData);
    }

    /**
     * Send welcome notification
     */
    public function sendWelcomeNotification($userId, $userData)
    {
        $title = 'Welcome to Our Platform!';
        $message = "Welcome {$userData['name']}! Thank you for joining our platform.";
        
        return $this->sendNotification($userId, 'welcome', $title, $message, $userData);
    }
}