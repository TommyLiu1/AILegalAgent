/**
 * 按钮组组件
 * 
 * 支持 horizontal / vertical / grid 布局
 * grid 模式下按钮带卡片效果，适合快捷入口场景
 */

import { memo } from 'react';
import { Loader2, Users, FileText, PenTool, Shield, MessageCircle, Search, ChevronRight } from 'lucide-react';
import type { ButtonGroupComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  users: Users,
  'file-text': FileText,
  'pen-tool': PenTool,
  shield: Shield,
  'message-circle': MessageCircle,
  search: Search,
};

interface Props {
  component: ButtonGroupComponent;
  onEvent: A2UIEventHandler;
}

export const ButtonGroup = memo(function ButtonGroup({ component, onEvent }: Props) {
  const { data } = component;
  const isGrid = data.layout === 'grid';

  return (
    <div className={cn(
      'a2ui-button-group',
      data.layout === 'vertical' && 'flex flex-col gap-2',
      isGrid && 'grid grid-cols-2 gap-2.5',
      (!data.layout || data.layout === 'horizontal') && 'flex flex-wrap gap-2',
      data.align === 'center' && 'justify-center',
      data.align === 'right' && 'justify-end',
      data.align === 'stretch' && !isGrid && '[&>button]:flex-1',
      component.className,
    )}>
      {data.buttons.map((btn) => {
        const Icon = btn.icon ? ICON_MAP[btn.icon] : null;

        return (
          <button
            key={btn.id}
            onClick={() => {
              if (!btn.disabled && !btn.loading) {
                onEvent({
                  type: 'action',
                  actionId: btn.actionId,
                  componentId: component.id,
                  payload: btn.payload,
                });
              }
            }}
            disabled={btn.disabled || btn.loading}
            className={cn(
              'transition-all active:scale-[0.97]',
              // Grid 模式 — 卡片式按钮
              isGrid && 'flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm text-left group',
              // 非 Grid 模式 — 标准按钮
              !isGrid && 'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
              !isGrid && btn.size === 'sm' && 'px-3 py-1.5 text-xs',
              !isGrid && btn.size === 'lg' && 'px-6 py-3 text-base',
              !isGrid && (!btn.size || btn.size === 'md') && 'px-5 py-2.5 text-sm',
              !isGrid && btn.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
              !isGrid && btn.variant === 'secondary' && 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
              !isGrid && btn.variant === 'outline' && 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50',
              !isGrid && btn.variant === 'ghost' && 'text-zinc-600 hover:bg-zinc-100',
              !isGrid && btn.variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700',
              !isGrid && !btn.variant && 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
              (btn.disabled || btn.loading) && 'opacity-50 cursor-not-allowed',
            )}
          >
            {btn.loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isGrid && Icon && (
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                <Icon className="w-4.5 h-4.5" />
              </div>
            )}
            {isGrid ? (
              <span className="text-sm font-medium text-gray-700 flex-1">{btn.label}</span>
            ) : (
              <span>{btn.label}</span>
            )}
            {isGrid && (
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
            )}
          </button>
        );
      })}
    </div>
  );
});
