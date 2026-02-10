/**
 * 快捷操作栏
 * 类似千问底部的"深度思考 / AI生图 / 拍题答疑 / AI生视频"
 * → 法务场景：合同审查 / 风险评估 / 法律咨询 / 文书起草
 */

import { memo } from 'react';
import {
  FileSearch, Shield, MessageSquareText, FileText, Scale,
  BookOpen, Search, UserCheck, Gavel, Brain,
} from 'lucide-react';
import type { ActionBarComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: ActionBarComponent;
  onEvent: A2UIEventHandler;
}

const iconMap: Record<string, any> = {
  'file-search': FileSearch,
  'shield': Shield,
  'message': MessageSquareText,
  'file-text': FileText,
  'scale': Scale,
  'book': BookOpen,
  'search': Search,
  'user-check': UserCheck,
  'gavel': Gavel,
  'brain': Brain,
};

export const ActionBar = memo(function ActionBar({ component, onEvent }: Props) {
  const { data } = component;

  return (
    <div className={cn(
      'a2ui-action-bar',
      data.sticky && 'sticky bottom-0 z-10',
      component.className,
    )}>
      <div className={cn(
        'flex gap-2 py-2',
        data.layout === 'grid'
          ? 'flex-wrap justify-center'
          : 'overflow-x-auto scrollbar-hide',
      )}
        style={data.layout !== 'grid' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
      >
        {data.items.map((item) => {
          const Icon = item.icon ? iconMap[item.icon] : null;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  onEvent({
                    type: 'action',
                    actionId: item.actionId,
                    componentId: component.id,
                    payload: { itemId: item.id },
                  });
                }
              }}
              disabled={item.disabled}
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
                'text-xs font-medium transition-all',
                'border border-zinc-200 dark:border-zinc-700',
                'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
                'hover:bg-zinc-50 hover:border-zinc-300 dark:hover:bg-zinc-700',
                'active:scale-95',
                item.disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {item.label}
              {item.badge && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
