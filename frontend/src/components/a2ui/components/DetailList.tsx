/**
 * 详情列表组件
 * Key-Value 格式展示信息
 */

import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { DetailListComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: DetailListComponent;
  onEvent: A2UIEventHandler;
}

export const DetailList = memo(function DetailList({ component, onEvent }: Props) {
  const { data } = component;

  return (
    <div className={cn(
      'a2ui-detail-list bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800',
      component.className,
    )}>
      {data.title && (
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{data.title}</h4>
        </div>
      )}
      <div className="px-4 pb-2">
        {data.items.map((item, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start justify-between py-3',
              data.divider !== false && i < data.items.length - 1 && 'border-b border-zinc-50 dark:border-zinc-800/50',
            )}
          >
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
              {item.label}
            </span>
            <div className="flex items-center gap-1 ml-4">
              {item.valueType === 'badge' ? (
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                  item.color === 'green' && 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  item.color === 'red' && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  item.color === 'orange' && 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                  !item.color && 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                )}>
                  {item.value}
                </span>
              ) : item.valueType === 'link' ? (
                <a href={item.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {item.value}
                </a>
              ) : item.valueType === 'highlight' ? (
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.value}
                </span>
              ) : (
                <span className="text-xs text-zinc-700 dark:text-zinc-300 text-right">
                  {item.value}
                </span>
              )}
              {item.editable && (
                <button
                  onClick={() => item.editActionId && onEvent({
                    type: 'action',
                    actionId: item.editActionId,
                    componentId: component.id,
                    payload: { field: item.label },
                  })}
                  className="text-blue-500"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
