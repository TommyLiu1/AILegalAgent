/**
 * 费用估算卡片
 * 展示法律服务费用明细、支付方式选择
 * 
 * 用于：律师咨询费、诉讼费用估算、服务套餐对比
 */

import { memo, useState } from 'react';
import { DollarSign, Check, Info, ChevronRight } from 'lucide-react';
import type { A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

export interface FeeEstimateData {
  title: string;
  subtitle?: string;
  /** 费用明细 */
  items: FeeItem[];
  /** 折扣 */
  discounts?: { label: string; amount: number; type: 'fixed' | 'percent' }[];
  /** 总计 */
  total: { label: string; amount: number; original?: number };
  /** 服务套餐选择 */
  packages?: FeePackage[];
  /** 付款方式 */
  paymentMethods?: { id: string; name: string; icon?: string; recommended?: boolean }[];
  /** 备注 */
  notes?: string[];
  /** 操作 */
  actions?: {
    label: string;
    actionId: string;
    variant?: 'primary' | 'secondary' | 'outline';
    payload?: Record<string, any>;
  }[];
}

interface FeeItem {
  id: string;
  label: string;
  description?: string;
  amount: number;
  /** 单位 */
  unit?: string;
  /** 是否可选 */
  optional?: boolean;
  /** 选中状态 */
  selected?: boolean;
}

interface FeePackage {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  originalPrice?: number;
  popular?: boolean;
  actionId: string;
}

export interface FeeEstimateCardComponent {
  id: string;
  type: 'fee-estimate';
  data: FeeEstimateData;
  visible?: boolean;
  className?: string;
}

interface Props {
  component: FeeEstimateCardComponent;
  onEvent: A2UIEventHandler;
}

export const FeeEstimateCard = memo(function FeeEstimateCard({ component, onEvent }: Props) {
  const { data } = component;
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    data.items.forEach(item => {
      if (!item.optional || item.selected) initial.add(item.id);
    });
    return initial;
  });
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 计算选中的费用总计
  const subtotal = data.items
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.amount, 0);

  const discountTotal = (data.discounts || []).reduce((sum, d) => {
    return sum + (d.type === 'fixed' ? d.amount : subtotal * d.amount / 100);
  }, 0);

  const finalTotal = subtotal - discountTotal;

  return (
    <div className={cn(
      'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden',
      component.className,
    )}>
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 rounded-lg">
            <DollarSign className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{data.title}</h3>
            {data.subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{data.subtitle}</p>}
          </div>
        </div>
      </div>

      {/* 服务套餐（如有） */}
      {data.packages && data.packages.length > 0 && (
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">选择服务套餐</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => {
                  setSelectedPackage(pkg.id);
                  onEvent({
                    type: 'selection',
                    actionId: pkg.actionId,
                    componentId: component.id,
                    payload: { packageId: pkg.id },
                  });
                }}
                className={cn(
                  'relative text-left p-3 rounded-xl border-2 transition-all',
                  selectedPackage === pkg.id
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-200',
                )}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 right-3 text-[9px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full">
                    推荐
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{pkg.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-orange-600">¥{pkg.price.toLocaleString()}</span>
                    {pkg.originalPrice && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-through ml-1">¥{pkg.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">{pkg.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {pkg.features.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-green-700">
                      <Check className="w-2.5 h-2.5" /> {f}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 费用明细 */}
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">费用明细</p>
        <div className="space-y-2">
          {data.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 py-1.5',
                item.optional ? 'cursor-pointer' : '',
              )}
              onClick={() => item.optional && toggleItem(item.id)}
            >
              {item.optional && (
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                  selectedItems.has(item.id) ? 'bg-blue-600 border-blue-600' : 'border-zinc-300 dark:border-zinc-600',
                )}>
                  {selectedItems.has(item.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs text-zinc-700 dark:text-zinc-300">{item.label}</span>
                {item.description && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1">{item.description}</span>
                )}
              </div>
              <span className={cn(
                'text-xs font-medium',
                selectedItems.has(item.id) ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500',
              )}>
                ¥{item.amount.toLocaleString()}
                {item.unit && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">/{item.unit}</span>}
              </span>
            </div>
          ))}
        </div>

        {/* 折扣 */}
        {data.discounts && data.discounts.length > 0 && (
          <div className="mt-2 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-700 space-y-1">
            {data.discounts.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-green-600">{d.label}</span>
                <span className="text-green-600 font-medium">
                  -{d.type === 'fixed' ? `¥${d.amount.toLocaleString()}` : `${d.amount}%`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 总计 */}
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{data.total.label || '合计'}</span>
          <div className="text-right">
            <span className="text-lg font-bold text-orange-600">
              ¥{finalTotal.toLocaleString()}
            </span>
            {data.total.original && data.total.original > finalTotal && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 line-through ml-2">
                ¥{data.total.original.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 备注 */}
      {data.notes && data.notes.length > 0 && (
        <div className="px-4 py-2 bg-amber-50/50 border-t border-zinc-100 dark:border-zinc-800">
          {data.notes.map((note, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-700">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      {data.actions && data.actions.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          {data.actions.map((action) => (
            <button
              key={action.actionId}
              onClick={() => onEvent({
                type: 'action',
                actionId: action.actionId,
                componentId: component.id,
                payload: {
                  ...action.payload,
                  selectedItems: Array.from(selectedItems),
                  selectedPackage,
                  totalAmount: finalTotal,
                },
              })}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98]',
                action.variant === 'primary'
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : action.variant === 'outline'
                  ? 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              )}
            >
              {action.label}
              {action.variant === 'primary' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
