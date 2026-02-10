import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, BarChart3, GraduationCap, Briefcase, FileStack, Bell, User, Menu, X, Settings, FileCheck, Bot, Calculator, Search } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { UserProfile } from './UserProfile';
import { HardwareStatus } from './ui/HardwareStatus';
import { PrivacyToggle } from './ui/PrivacyToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsApi } from '../lib/api';

const navItems = [
  { id: 'chat', path: '/chat', label: '智能对话', icon: MessageSquare },
  { id: 'due-diligence', path: '/due-diligence', label: '尽职调查', icon: Search },
  { id: 'cases', path: '/cases', label: '案件管理', icon: Briefcase },
  { id: 'documents', path: '/documents', label: '智能文档', icon: FileStack },
  { id: 'knowledge', path: '/knowledge', label: '知识中心', icon: GraduationCap },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationsApi.list({ unread_only: true });
        setUnreadCount(response.total);
      } catch (error) {
        console.error('Failed to fetch unread notifications count:', error);
      }
    };
    fetchUnreadCount();
    // Poll every minute
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentPath = location.pathname;

  const handleNavClick = (path: string) => {
    navigate(path);
    setShowMobileMenu(false);
  };

  return (
    <div className="h-screen bg-muted/30 flex flex-col overflow-hidden">
      {/* Navigation - Desktop */}
      <div className="hidden lg:block bg-background border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-legal-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">安心AI法务</h1>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-3 mr-4">
            <HardwareStatus />
            <div className="h-6 w-px bg-border mx-1" />
            <PrivacyToggle />
          </div>

          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-white shadow-legal-sm'
                      : 'text-muted-foreground hover:bg-primary-50 hover:text-primary active:scale-95'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-4 border-l border-border pl-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-primary-50 hover:text-primary rounded-lg transition-colors active:scale-95"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-primary-50 hover:text-primary rounded-lg transition-colors active:scale-95"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-background">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1.5 hover:bg-primary-50 rounded-lg transition-colors active:scale-95"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-legal-sm">
                <User className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation - Mobile */}
      <div className="lg:hidden bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-legal-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">安心AI法务</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-primary-50 hover:text-primary rounded-lg transition-colors active:scale-95"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-background">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-primary-50 hover:text-primary rounded-lg transition-colors active:scale-95"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                        isActive
                          ? 'bg-primary text-white shadow-legal-sm'
                          : 'text-muted-foreground hover:bg-primary-50 hover:text-primary active:bg-primary-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setShowProfile(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 text-muted-foreground hover:bg-primary-50 hover:text-primary active:bg-primary-100"
                >
                  <User className="w-5 h-5" />
                  用户中心
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* Notification Center */}
      {showNotifications && (
        <NotificationCenter
          onClose={() => setShowNotifications(false)}
          onClearAll={() => setUnreadCount(0)}
        />
      )}

      {/* User Profile */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
