/**
 * 推荐卡片组件
 * 类似千问的商品推荐卡片 → 法务场景：律师推荐、法条推荐、服务推荐
 */

import { memo } from 'react';
import { Star, MapPin, ChevronRight } from 'lucide-react';
import type { RecommendationCardComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: RecommendationCardComponent;
  onEvent: A2UIEventHandler;
}

export const RecommendationCard = memo(function RecommendationCard({ component, onEvent }: Props) {
  const { data } = component;

  const handleAction = () => {
    if (data.action) {
      onEvent({
        type: 'action',
        actionId: data.action.actionId,
        componentId: component.id,
        payload: data.action.payload,
      });
    }
  };

  const handleSecondaryAction = () => {
    if (data.secondaryAction) {
      onEvent({
        type: 'action',
        actionId: data.secondaryAction.actionId,
        componentId: component.id,
        payload: data.secondaryAction.payload,
      });
    }
  };

  return (
    <div className={cn(
      'a2ui-recommendation-card',
      'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800',
      'shadow-sm hover:shadow-md transition-shadow duration-200',
      'overflow-hidden',
      component.className,
    )}>
      {/* 主体内容 */}
      <div className="flex gap-3 p-4">
        {/* 图片区 */}
        {(data.image || data.imageFallback) && (
          <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {data.image ? (
              <img src={data.image} alt={data.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-400">
                {data.imageFallback}
              </div>
            )}
          </div>
        )}

        {/* 信息区 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-1">
              {data.title}
            </h4>
            {data.rating !== undefined && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {data.ratingText || data.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* 副标题 */}
          {data.subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{data.subtitle}</p>
          )}

          {/* 元信息 */}
          {data.meta && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {data.meta}
            </p>
          )}

          {/* 标签 */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.tags.map((tag, i) => (
                <span
                  key={i}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                    tag.color === 'blue' && 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    tag.color === 'green' && 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    tag.color === 'orange' && 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                    tag.color === 'red' && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    !tag.color && 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                  )}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* 描述 */}
          {data.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}

          {/* 价格 + 操作 */}
          <div className="flex items-center justify-between mt-3">
            {data.price && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {data.price.currency || '¥'}{data.price.amount}
                </span>
                {data.price.original && (
                  <span className="text-xs text-zinc-400 line-through">
                    {data.price.currency || '¥'}{data.price.original}
                  </span>
                )}
                {data.price.label && (
                  <span className="text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-medium">
                    {data.price.label}
                  </span>
                )}
              </div>
            )}
            {data.action && (
              <button
                onClick={handleAction}
                className={cn(
                  'inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
                  data.action.variant === 'secondary'
                    ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                    : data.action.variant === 'outline'
                    ? 'border border-blue-500 text-blue-600 hover:bg-blue-50 dark:text-blue-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700',
                )}
              >
                {data.action.label}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 详情列表 */}
      {data.details && data.details.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2">
          {data.details.map((detail, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-xs text-zinc-500">{detail.label}</span>
              <span className="text-xs text-zinc-700 dark:text-zinc-300">{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 次要操作 */}
      {data.secondaryAction && (
        <button
          onClick={handleSecondaryAction}
          className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          {data.secondaryAction.label}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});
