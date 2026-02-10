/**
 * 信息横幅
 * 类似千问的地址栏/活动公告横幅
 * → 法务场景：案件进度通知、法律政策更新提醒
 */

import { memo, useState } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle, Gift, X, ChevronRight } from 'lucide-react';
import type { InfoBannerComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: InfoBannerComponent;
  onEvent: A2UIEventHandler;
}

const variantConfig = {
  info: { icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800' },
  success: { icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-100 dark:border-green-800' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-800' },
  error: { icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-100 dark:border-red-800' },
  promo: { icon: Gift, bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800' },
};

export const InfoBanner = memo(function InfoBanner({ component, onEvent }: Props) {
  const { data } = component;
  const [dismissed, setDismissed] = useState(false);
  const variant = data.variant || 'info';
  const config = variantConfig[variant];
  const Icon = config.icon;

  if (dismissed) return null;

  return (
    <div className={cn(
      'a2ui-info-banner flex items-center gap-2 px-4 py-2.5 rounded-xl border',
      config.bg, config.border,
      component.className,
    )}>
      <Icon className={cn('w-4 h-4 flex-shrink-0', config.text)} />
      <p className={cn('flex-1 text-xs leading-relaxed', config.text)}>
        {data.content}
      </p>
      {data.action && (
        <button
          onClick={() => onEvent({
            type: 'action',
            actionId: data.action!.actionId,
            componentId: component.id,
          })}
          className={cn('flex-shrink-0 flex items-center gap-0.5 text-xs font-medium', config.text)}
        >
          {data.action.label}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
      {data.dismissible && (
        <button
          onClick={() => {
            setDismissed(true);
            onEvent({ type: 'dismiss', actionId: 'banner-dismiss', componentId: component.id });
          }}
          className="flex-shrink-0 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
        >
          <X className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      )}
    </div>
  );
});
