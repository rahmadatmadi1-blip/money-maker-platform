import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Settings } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNotifications } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  selectNotifications,
  selectUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotifications as clearNotificationsAction
} from '../store/socketSlice';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [showSettings, setShowSettings] = useState(false);
  const dispatch = useDispatch();
  
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  
  const {
    markAsRead,
    markAllAsRead,
    clearNotifications
  } = useNotifications();

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'read':
        return notification.read;
      default:
        return true;
    }
  });

  // Get notification icon based on type
  const getNotificationIcon = (type, priority) => {
    const iconClass = `w-5 h-5 ${
      priority === 'urgent' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'medium' ? 'text-blue-500' :
      'text-gray-500'
    }`;

    switch (type) {
      case 'order':
        return <div className={`${iconClass} bg-green-100 p-1 rounded`}>🛒</div>;
      case 'payment':
        return <div className={`${iconClass} bg-blue-100 p-1 rounded`}>💳</div>;
      case 'earnings':
        return <div className={`${iconClass} bg-yellow-100 p-1 rounded`}>💰</div>;
      case 'affiliate':
        return <div className={`${iconClass} bg-purple-100 p-1 rounded`}>🤝</div>;
      case 'system':
        return <div className={`${iconClass} bg-gray-100 p-1 rounded`}>⚙️</div>;
      case 'review':
        return <div className={`${iconClass} bg-pink-100 p-1 rounded`}>⭐</div>;
      default:
        return <div className={`${iconClass} bg-gray-100 p-1 rounded`}>📢</div>;
    }
  };

  // Get notification color based on priority
  const getNotificationColor = (priority, read) => {
    if (read) return 'bg-gray-50 border-gray-200';
    
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifikasi
                  {unreadCount > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({unreadCount} belum dibaca)
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Pengaturan"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-1 mt-3">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'unread', label: 'Belum Dibaca' },
                  { key: 'read', label: 'Sudah Dibaca' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filter === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {/* Action Buttons */}
              {notifications.length > 0 && (
                <div className="flex space-x-2 mt-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Tandai Semua Dibaca</span>
                    </button>
                  )}
                  <button
                    onClick={clearNotifications}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Semua</span>
                  </button>
                </div>
              )}
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Pengaturan Notifikasi</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Suara notifikasi</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Notifikasi desktop</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Email notifikasi</span>
                  </label>
                </div>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {filter === 'unread' ? 'Tidak ada notifikasi yang belum dibaca' :
                     filter === 'read' ? 'Tidak ada notifikasi yang sudah dibaca' :
                     'Belum ada notifikasi'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        getNotificationColor(notification.priority, notification.read)
                      } ${!notification.read ? 'border-l-4' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              notification.read ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                title="Tandai sebagai dibaca"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          
                          <p className={`text-sm mt-1 ${
                            notification.read ? 'text-gray-500' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {/* Metadata */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: id
                              })}
                            </span>
                            
                            {notification.priority === 'urgent' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Urgent
                              </span>
                            )}
                            
                            {notification.priority === 'high' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Penting
                              </span>
                            )}
                          </div>
                          
                          {/* Action Button */}
                          {notification.actionText && notification.actionUrl && (
                            <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                              {notification.actionText} →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Lihat Semua Notifikasi
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;