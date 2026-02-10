
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, AlertCircle, Calendar, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { notificationsApi, Notification } from '../lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface NotificationCenterProps {
  onClose: () => void;
  onClearAll: () => void; // Keeping this prop for now, but implementation will be internal
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.list({ limit: 50 });
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('获取通知失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('已全部标记为已读');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('操作失败');
    }
  };

  const typeConfig = {
    urgent: { bg: 'bg-[#FFF1F0]', border: 'border-[#FF3B30]', text: 'text-[#FF3B30]', icon: AlertCircle },
    warning: { bg: 'bg-[#FFF8ED]', border: 'border-[#FF9500]', text: 'text-[#FF9500]', icon: AlertCircle },
    info: { bg: 'bg-[#E5F3FF]', border: 'border-[#007AFF]', text: 'text-[#007AFF]', icon: Bell },
    success: { bg: 'bg-[#E8F8EE]', border: 'border-[#34C759]', text: 'text-[#34C759]', icon: Check },
  };

  const getIcon = (type: string) => {
    const config = typeConfig[type as keyof typeof typeConfig];
    return config ? config.icon : Bell;
  };

  const getConfig = (type: string) => {
    return typeConfig[type as keyof typeof typeConfig] || typeConfig.info;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
      >
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#E5E5EA]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#8E8E93]" />
                <h2 className="font-semibold text-[#1C1C1E]">通知中心</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#F2F2F7] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-[#007AFF] hover:text-[#0051D5] font-medium active:opacity-70 transition-opacity"
            >
              全部标记为已读
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Bell className="w-12 h-12 mb-2 opacity-20" />
                <p>暂无通知</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification, index) => {
                  const config = getConfig(notification.type);
                  const Icon = getIcon(notification.type);

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                      className={`p-4 rounded-2xl border ${config.border} ${config.bg} cursor-pointer active:scale-98 transition-all ${
                        !notification.is_read ? 'border-l-4' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm text-[#1C1C1E]">{notification.title}</h4>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-[#007AFF] rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-sm text-[#3C3C43] leading-relaxed mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-[#8E8E93]">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: zhCN })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#E5E5EA]">
            <button className="w-full py-2.5 text-sm text-[#007AFF] hover:bg-[#F2F2F7] rounded-xl font-medium transition-colors active:scale-98">
              查看全部通知
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
