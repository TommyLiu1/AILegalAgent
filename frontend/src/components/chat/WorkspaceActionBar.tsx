/**
 * 工作台动作按钮区 — Agent 推送的快捷操作
 * 
 * 支持多种样式变体：primary / secondary / warning / success
 * 点击后通过回调通知上层，支持附带数据
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, FileText, Scale, Send, Download,
  Eye, RefreshCw, CheckCircle, AlertTriangle,
  Pen, Stamp, UserCheck, Zap,
} from 'lucide-react';
import type { WorkspaceAction } from '@/lib/store';

interface WorkspaceActionBarProps {
  actions: WorkspaceAction[];
  onAction: (actionId: string, payload?: any) => void;
}

const iconMap: Record<string, React.ElementType> = {
  arrow: ArrowRight,
  document: FileText,
  contract: Scale,
  send: Send,
  download: Download,
  preview: Eye,
  refresh: RefreshCw,
  check: CheckCircle,
  warning: AlertTriangle,
  edit: Pen,
  stamp: Stamp,
  approve: UserCheck,
  quick: Zap,
};

const variantStyles: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200',
  success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200',
};

export const WorkspaceActionBar = memo(function WorkspaceActionBar({
  actions,
  onAction,
}: WorkspaceActionBarProps) {
  if (actions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-bold text-gray-600">快捷操作</span>
      </div>

      <div className="space-y-2">
        {actions.map((action, index) => {
          const Icon = action.icon ? (iconMap[action.icon] || ArrowRight) : ArrowRight;
          const style = variantStyles[action.variant] || variantStyles.secondary;

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onAction(action.action, action.payload)}
              disabled={action.disabled}
              whileHover={action.disabled ? {} : { scale: 1.01 }}
              whileTap={action.disabled ? {} : { scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                action.disabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${style}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 text-left">
                <span>{action.label}</span>
                {action.description && (
                  <p className={`text-[11px] mt-0.5 ${
                    action.variant === 'secondary' ? 'text-gray-400' : 'opacity-70'
                  }`}>
                    {action.description}
                  </p>
                )}
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
