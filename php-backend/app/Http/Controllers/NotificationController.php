<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\EmailTemplate;
use App\Models\EmailCampaign;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class NotificationController extends Controller
{
    /**
     * Get user's notifications
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 20);
            $type = $request->get('type', '');
            $read = $request->get('read', '');

            $query = Notification::where('user_id', auth()->id());

            // Type filter
            if ($type) {
                $query->where('type', $type);
            }

            // Read status filter
            if ($read !== '') {
                $query->where('is_read', $read === 'true');
            }

            $notifications = $query->orderBy('created_at', 'desc')
                                  ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'notifications' => $notifications->items(),
                'pagination' => [
                    'current' => $notifications->currentPage(),
                    'pages' => $notifications->lastPage(),
                    'total' => $notifications->total(),
                    'limit' => $notifications->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil notifikasi'
            ], 500);
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead($id)
    {
        try {
            $notification = Notification::where('id', $id)
                                      ->where('user_id', auth()->id())
                                      ->firstOrFail();

            $notification->update([
                'is_read' => true,
                'read_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notifikasi ditandai sebagai sudah dibaca'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Notifikasi tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead()
    {
        try {
            Notification::where('user_id', auth()->id())
                       ->where('is_read', false)
                       ->update([
                           'is_read' => true,
                           'read_at' => now()
                       ]);

            return response()->json([
                'success' => true,
                'message' => 'Semua notifikasi ditandai sebagai sudah dibaca'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui notifikasi'
            ], 500);
        }
    }

    /**
     * Delete notification
     */
    public function destroy($id)
    {
        try {
            $notification = Notification::where('id', $id)
                                      ->where('user_id', auth()->id())
                                      ->firstOrFail();

            $notification->delete();

            return response()->json([
                'success' => true,
                'message' => 'Notifikasi berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Notifikasi tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Get unread count
     */
    public function unreadCount()
    {
        try {
            $count = Notification::where('user_id', auth()->id())
                               ->where('is_read', false)
                               ->count();

            return response()->json([
                'success' => true,
                'unread_count' => $count
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil jumlah notifikasi'
            ], 500);
        }
    }

    /**
     * Get notification settings
     */
    public function getSettings()
    {
        try {
            $user = User::find(auth()->id());
            
            $settings = [
                'email_notifications' => $user->email_notifications ?? true,
                'push_notifications' => $user->push_notifications ?? true,
                'order_notifications' => $user->order_notifications ?? true,
                'service_notifications' => $user->service_notifications ?? true,
                'payment_notifications' => $user->payment_notifications ?? true,
                'marketing_notifications' => $user->marketing_notifications ?? false
            ];

            return response()->json([
                'success' => true,
                'settings' => $settings
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil pengaturan notifikasi'
            ], 500);
        }
    }

    /**
     * Update notification settings
     */
    public function updateSettings(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email_notifications' => 'boolean',
            'push_notifications' => 'boolean',
            'order_notifications' => 'boolean',
            'service_notifications' => 'boolean',
            'payment_notifications' => 'boolean',
            'marketing_notifications' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::find(auth()->id());
            
            $user->update($request->only([
                'email_notifications',
                'push_notifications',
                'order_notifications',
                'service_notifications',
                'payment_notifications',
                'marketing_notifications'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Pengaturan notifikasi berhasil diperbarui'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui pengaturan'
            ], 500);
        }
    }

    /**
     * Admin: Get all email templates
     */
    public function getEmailTemplates(Request $request)
    {
        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $page = $request->get('page', 1);
            $limit = $request->get('limit', 20);
            $type = $request->get('type', '');
            $active = $request->get('active', '');

            $query = EmailTemplate::query();

            // Type filter
            if ($type) {
                $query->where('type', $type);
            }

            // Active status filter
            if ($active !== '') {
                $query->where('is_active', $active === 'true');
            }

            $templates = $query->orderBy('created_at', 'desc')
                             ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'templates' => $templates->items(),
                'pagination' => [
                    'current' => $templates->currentPage(),
                    'pages' => $templates->lastPage(),
                    'total' => $templates->total(),
                    'limit' => $templates->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil template email'
            ], 500);
        }
    }

    /**
     * Admin: Create email template
     */
    public function createEmailTemplate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:welcome,order_confirmation,payment_success,service_update,newsletter',
            'subject' => 'required|string|max:255',
            'html_content' => 'required|string',
            'text_content' => 'nullable|string',
            'variables' => 'nullable|array',
            'design_settings' => 'nullable|array',
            'is_active' => 'boolean',
            'is_system' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $template = EmailTemplate::create([
                'name' => $request->name,
                'slug' => $this->generateUniqueSlug($request->name),
                'type' => $request->type,
                'subject' => $request->subject,
                'html_content' => $request->html_content,
                'text_content' => $request->text_content,
                'variables' => $request->variables ?? [],
                'design_settings' => $request->design_settings ?? [],
                'is_active' => $request->is_active ?? true,
                'is_system' => $request->is_system ?? false,
                'created_by' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Template email berhasil dibuat',
                'template' => $template
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat template email'
            ], 500);
        }
    }

    /**
     * Admin: Update email template
     */
    public function updateEmailTemplate(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'subject' => 'string|max:255',
            'html_content' => 'string',
            'text_content' => 'nullable|string',
            'variables' => 'nullable|array',
            'design_settings' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $template = EmailTemplate::findOrFail($id);

            // Prevent editing system templates
            if ($template->is_system && !in_array($request->only(['is_active']), [['is_active' => true], ['is_active' => false]])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Template sistem tidak dapat diedit'
                ], 400);
            }

            $updateData = $request->only([
                'name', 'subject', 'html_content', 'text_content',
                'variables', 'design_settings', 'is_active'
            ]);

            // Update slug if name changed
            if ($request->has('name') && $request->name !== $template->name) {
                $updateData['slug'] = $this->generateUniqueSlug($request->name, $template->id);
            }

            $template->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Template email berhasil diperbarui',
                'template' => $template
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui template email'
            ], 500);
        }
    }

    /**
     * Admin: Delete email template
     */
    public function deleteEmailTemplate($id)
    {
        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $template = EmailTemplate::findOrFail($id);

            // Prevent deleting system templates
            if ($template->is_system) {
                return response()->json([
                    'success' => false,
                    'message' => 'Template sistem tidak dapat dihapus'
                ], 400);
            }

            // Check if template is used in campaigns
            $campaignCount = EmailCampaign::where('template_id', $id)->count();
            if ($campaignCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Template tidak dapat dihapus karena sedang digunakan dalam kampanye'
                ], 400);
            }

            $template->delete();

            return response()->json([
                'success' => true,
                'message' => 'Template email berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menghapus template email'
            ], 500);
        }
    }

    /**
     * Admin: Get email campaigns
     */
    public function getEmailCampaigns(Request $request)
    {
        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $page = $request->get('page', 1);
            $limit = $request->get('limit', 20);
            $status = $request->get('status', '');

            $query = EmailCampaign::with([
                'template:id,name,subject',
                'creator:id,name,email'
            ]);

            // Status filter
            if ($status) {
                $query->where('status', $status);
            }

            $campaigns = $query->orderBy('created_at', 'desc')
                             ->paginate($limit, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'campaigns' => $campaigns->items(),
                'pagination' => [
                    'current' => $campaigns->currentPage(),
                    'pages' => $campaigns->lastPage(),
                    'total' => $campaigns->total(),
                    'limit' => $campaigns->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil kampanye email'
            ], 500);
        }
    }

    /**
     * Admin: Create email campaign
     */
    public function createEmailCampaign(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'template_id' => 'required|exists:email_templates,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'subject_override' => 'nullable|string|max:255',
            'target_audience' => 'required|string|in:all_users,premium_users,new_users,inactive_users,custom',
            'audience_filters' => 'nullable|array',
            'send_type' => 'required|string|in:immediate,scheduled,recurring',
            'scheduled_at' => 'nullable|date|after:now',
            'recurring_settings' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check if user is admin
            if (auth()->user()->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            // Validate template exists and is active
            $template = EmailTemplate::where('id', $request->template_id)
                                   ->where('is_active', true)
                                   ->firstOrFail();

            $campaign = EmailCampaign::create([
                'template_id' => $request->template_id,
                'created_by' => auth()->id(),
                'name' => $request->name,
                'description' => $request->description,
                'subject_override' => $request->subject_override,
                'target_audience' => $request->target_audience,
                'audience_filters' => $request->audience_filters ?? [],
                'send_type' => $request->send_type,
                'scheduled_at' => $request->scheduled_at,
                'recurring_settings' => $request->recurring_settings ?? [],
                'status' => $request->send_type === 'immediate' ? 'sending' : 'scheduled'
            ]);

            // If immediate send, process the campaign
            if ($request->send_type === 'immediate') {
                $this->processCampaign($campaign);
            }

            return response()->json([
                'success' => true,
                'message' => 'Kampanye email berhasil dibuat',
                'campaign' => $campaign->load('template:id,name,subject')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat kampanye email'
            ], 500);
        }
    }

    /**
     * Generate unique slug for email template
     */
    private function generateUniqueSlug($name, $excludeId = null)
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        while (true) {
            $query = EmailTemplate::where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            
            if (!$query->exists()) {
                break;
            }
            
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Process email campaign (simplified version)
     */
    private function processCampaign($campaign)
    {
        // This would typically be handled by a queue job
        // For now, just update the recipient count based on target audience
        
        $recipientCount = 0;
        
        switch ($campaign->target_audience) {
            case 'all_users':
                $recipientCount = User::where('email_notifications', true)->count();
                break;
            case 'premium_users':
                $recipientCount = User::where('is_premium', true)
                                    ->where('email_notifications', true)
                                    ->count();
                break;
            case 'new_users':
                $recipientCount = User::where('created_at', '>=', now()->subDays(30))
                                    ->where('email_notifications', true)
                                    ->count();
                break;
            case 'inactive_users':
                $recipientCount = User::where('last_login_at', '<=', now()->subDays(30))
                                    ->where('email_notifications', true)
                                    ->count();
                break;
        }
        
        $campaign->update([
            'recipient_count' => $recipientCount,
            'status' => 'completed',
            'sent_at' => now()
        ]);
    }
}