/**
 * 订单/委托确认卡片
 * 类似千问的订单确认卡片：商品信息 + 配送详情 + 费用明细 + 操作按钮
 * → 法务场景：委托确认、服务订单确认
 */

import { memo } from 'react';
import { Edit3, ChevronRight } from 'lucide-react';
import type { OrderCardComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: OrderCardComponent;
  onEvent: A2UIEventHandler;
}

export const OrderCard = memo(function OrderCard({ component, onEvent }: Props) {
  const { data } = component;

  const handleAction = (actionId: string, payload?: Record<string, any>) => {
    onEvent({
      type: 'action',
      actionId,
      componentId: component.id,
      payload,
    });
  };

  return (
    <div className={cn(
      'a2ui-order-card',
      'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800',
      'shadow-sm overflow-hidden',
      component.className,
    )}>
      {/* 标题 */}
      {data.title && (
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{data.title}</h4>
        </div>
      )}

      {/* 商品/服务信息 */}
      <div className="flex gap-3 px-4 py-3">
        {data.item.image && (
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
            <img src={data.item.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h5 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {data.item.title}
          </h5>
          {data.item.subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5">{data.item.subtitle}</p>
          )}
          {data.item.specs && (
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              {data.item.specs}
              <Edit3 className="w-3 h-3 text-blue-500" />
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {data.item.price && (
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              ¥{data.item.price.amount}
            </span>
          )}
          {data.item.quantity && (
            <p className="text-xs text-zinc-400 mt-0.5">x{data.item.quantity}</p>
          )}
        </div>
      </div>

      {/* 详情列表 */}
      {data.details.length > 0 && (
        <div className="mx-4 border-t border-zinc-100 dark:border-zinc-800">
          {data.details.map((detail, i) => (
            <div key={i} className="flex items-start justify-between py-2.5 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
              <span className="text-xs text-zinc-500 flex-shrink-0 w-16">{detail.label}</span>
              <div className="flex items-center gap-1 flex-1 justify-end">
                <span className="text-xs text-zinc-700 dark:text-zinc-300 text-right">
                  {detail.value}
                </span>
                {detail.editable && (
                  <button
                    onClick={() => detail.editActionId && handleAction(detail.editActionId)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 费用明细 */}
      {data.pricing && (
        <div className="mx-4 pt-2 pb-3 border-t border-zinc-100 dark:border-zinc-800">
          {data.pricing.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-xs text-zinc-500">{item.label}</span>
              <div className="flex items-baseline gap-1">
                {item.original && (
                  <span className="text-xs text-zinc-400 line-through">¥{item.original}</span>
                )}
                <span className={cn(
                  'text-xs font-medium',
                  item.type === 'subtract' ? 'text-green-600 dark:text-green-400' : 'text-zinc-700 dark:text-zinc-300',
                )}>
                  {item.type === 'subtract' ? '-' : ''}¥{Math.abs(item.amount)}
                </span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-dashed border-zinc-200 dark:border-zinc-700">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {data.pricing.total.label}
            </span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              ¥{data.pricing.total.amount}
            </span>
          </div>
        </div>
      )}

      {/* 备注 */}
      {data.note && (
        <p className="mx-4 mb-2 text-[10px] text-zinc-400 leading-relaxed">{data.note}</p>
      )}

      {/* 操作按钮 */}
      {data.actions.length > 0 && (
        <div className={cn(
          'flex gap-2 p-4 border-t border-zinc-100 dark:border-zinc-800',
          data.actions.some((a) => a.fullWidth) ? 'flex-col' : 'flex-row',
        )}>
          {data.actions.map((action) => (
            <button
              key={action.actionId}
              onClick={() => handleAction(action.actionId, action.payload)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]',
                action.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
                action.variant === 'secondary' && 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                action.variant === 'outline' && 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300',
                action.variant === 'warning' && 'bg-amber-500 text-white hover:bg-amber-600',
                !action.variant && 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                action.fullWidth && 'w-full',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
