/**
 * 服务选择组件
 * 展示可选的法律服务类型，如合同审查、法律咨询、委托代理等
 */

import { memo } from 'react';
import { Check, Star } from 'lucide-react';
import type { ServiceSelectionComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: ServiceSelectionComponent;
  onEvent: A2UIEventHandler;
}

export const ServiceSelection = memo(function ServiceSelection({ component, onEvent }: Props) {
  const { data } = component;

  return (
    <div className={cn('a2ui-service-selection', component.className)}>
      {data.title && (
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{data.title}</h4>
      )}
      {data.subtitle && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{data.subtitle}</p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {data.services.map((service) => (
          <button
            key={service.id}
            onClick={() => onEvent({
              type: 'action',
              actionId: service.actionId,
              componentId: component.id,
              payload: { serviceId: service.id },
            })}
            className={cn(
              'relative text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md active:scale-[0.98]',
              service.popular
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900',
            )}
          >
            {/* 热门标记 */}
            {service.popular && (
              <div className="absolute -top-2.5 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold">
                <Star className="w-2.5 h-2.5 fill-current" />
                推荐
              </div>
            )}

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {service.name}
                </h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {service.description}
                </p>

                {/* 功能列表 */}
                {service.features.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 价格 */}
              {service.price && (
                <div className="text-right ml-4 flex-shrink-0">
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    ¥{service.price.amount}
                  </span>
                  {service.price.unit && (
                    <span className="text-xs text-zinc-400">/{service.price.unit}</span>
                  )}
                  {service.price.label && (
                    <p className="text-[10px] text-zinc-400 mt-0.5">{service.price.label}</p>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
