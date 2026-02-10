/**
 * 状态卡片
 * 类似千问的"付款成功"弹窗
 * → 法务场景：委托成功、合同签署完成、风险检测通过等
 */

import { memo } from 'react';
import { CheckCircle2, XCircle, Clock, Info, AlertTriangle } from 'lucide-react';
import type { StatusCardComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: StatusCardComponent;
  onEvent: A2UIEventHandler;
}

const statusConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-500',
    border: 'border-green-100 dark:border-green-800',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-500',
    border: 'border-red-100 dark:border-red-800',
  },
  pending: {
    icon: Clock,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-500',
    border: 'border-amber-100 dark:border-amber-800',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-500',
    border: 'border-blue-100 dark:border-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-500',
    border: 'border-orange-100 dark:border-orange-800',
  },
};

export const StatusCard = memo(function StatusCard({ component, onEvent }: Props) {
  const { data } = component;
  const config = statusConfig[data.status];
  const Icon = config.icon;

  return (
    <div className={cn(
      'a2ui-status-card rounded-2xl border p-6 text-center',
      config.bg, config.border,
      component.className,
    )}>
      <div className="flex justify-center mb-3">
        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', config.bg)}>
          <Icon className={cn('w-7 h-7', config.iconColor)} />
        </div>
      </div>

      <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
        {data.title}
      </h4>

      {data.description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
          {data.description}
        </p>
      )}

      {/* 操作按钮 */}
      {(data.action || data.secondaryAction) && (
        <div className="flex items-center justify-center gap-3 mt-4">
          {data.secondaryAction && (
            <button
              onClick={() => onEvent({
                type: 'action',
                actionId: data.secondaryAction!.actionId,
                componentId: component.id,
              })}
              className="px-5 py-2 rounded-full text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {data.secondaryAction.label}
            </button>
          )}
          {data.action && (
            <button
              onClick={() => onEvent({
                type: 'action',
                actionId: data.action!.actionId,
                componentId: component.id,
              })}
              className="px-6 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition active:scale-95"
            >
              {data.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
