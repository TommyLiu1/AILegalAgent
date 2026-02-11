import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Clock, FileWarning, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { casesApi } from '@/lib/api';

interface Alert {
  id: string;
  type: string;
  title: string;
  content: string;
  time: string;
}

export function RealtimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await casesApi.getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const typeStyles = {
    urgent: 'bg-destructive/10 border-destructive text-destructive',
    warning: 'bg-warning-light border-warning text-warning',
    info: 'bg-primary/10 border-primary text-primary',
  };

  const iconBgStyles = {
    urgent: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-primary/10 text-primary',
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent': return AlertTriangle;
      case 'warning': return Clock;
      default: return FileWarning;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-border p-6 h-[200px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl border border-border p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-destructive/10 rounded-xl flex items-center justify-center relative">
          <Bell className="w-4 h-4 text-destructive" />
          {alerts.length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-white"></div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">实时预警</h3>
          <p className="text-xs text-muted-foreground">{alerts.length} 条待处理</p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert, index) => {
            const Icon = getIcon(alert.type);
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border rounded-xl p-3 ${typeStyles[alert.type as keyof typeof typeStyles] || typeStyles.info}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgStyles[alert.type as keyof typeof iconBgStyles] || iconBgStyles.info}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1">{alert.title}</h4>
                    <p className="text-xs opacity-80 leading-relaxed">{alert.content}</p>
                    <p className="text-xs opacity-60 mt-1">{alert.time}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-4 text-muted-foreground/50 text-xs">暂无预警信息</div>
        )}
      </div>

      <button className="w-full mt-4 py-2 text-sm text-primary hover:text-primary/90 font-medium transition-colors active:opacity-70">
        查看全部预警 →
      </button>
    </motion.div>
  );
}
