import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Settings, Bell, Lock, HelpCircle, LogOut, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authApi, User as ApiUser } from '../lib/api';
import { toast } from 'sonner';

interface UserProfileProps {
  onClose: () => void;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
    } catch (error) {
        console.error('Failed to load profile', error);
        // 如果失败，尝试从 localStorage 读取（如果是登录后保存的）
        const stored = localStorage.getItem('user_info');
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }
  };

  const handleLogout = async () => {
    try {
        await authApi.logout();
        toast.success('已退出登录');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        window.location.reload(); // 简单处理，刷新页面回到登录页（如果有路由守卫）
    } catch (error) {
        console.error('Logout failed', error);
    }
  };

  const menuItems = [
    { icon: User, label: '个人信息', action: () => {} },
    { icon: Settings, label: '系统设置', action: () => {} },
    { icon: Bell, label: '通知偏好', action: () => {} },
    { icon: Lock, label: '安全与隐私', action: () => {} },
    { icon: HelpCircle, label: '帮助中心', action: () => {} },
  ];

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
          className="absolute right-0 top-0 bottom-0 w-80 bg-card shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 bg-primary text-white">
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <User className="w-8 h-8" />
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="font-semibold text-lg mb-1">{user?.name || '未登录'}</h3>
            <p className="text-white/80 text-sm">{user?.email || '请登录'}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2 mb-6">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-muted rounded-xl transition-colors text-left active:scale-98"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-foreground font-medium">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Settings */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between p-3.5 bg-muted rounded-xl">
                <div className="flex items-center gap-3">
                  {darkMode ? (
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Sun className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-foreground font-medium">深色模式</span>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    darkMode ? 'bg-success' : 'bg-border'
                  }`}
                >
                  <motion.div
                    animate={{ x: darkMode ? 20 : 2 }}
                    className="w-6 h-6 bg-white rounded-full my-0.5 shadow-sm"
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-muted rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground font-medium">推送通知</span>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    notifications ? 'bg-success' : 'bg-border'
                  }`}
                >
                  <motion.div
                    animate={{ x: notifications ? 20 : 2 }}
                    className="w-6 h-6 bg-white rounded-full my-0.5 shadow-sm"
                  />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">--</p>
                <p className="text-xs text-muted-foreground mt-1">进行中</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">--</p>
                <p className="text-xs text-muted-foreground mt-1">本月处理</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-success">--</p>
                <p className="text-xs text-muted-foreground mt-1">效率</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium active:scale-98"
            >
              <LogOut className="w-5 h-5" />
              退出登录
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
