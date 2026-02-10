/**
 * 风险指标组件
 * 仪表盘式的风险评分展示
 */

import { memo } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import type { RiskIndicatorComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: RiskIndicatorComponent;
  onEvent: A2UIEventHandler;
}

const levelConfig = {
  low: { label: '低风险', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', trackBg: 'bg-green-100 dark:bg-green-900/30' },
  medium: { label: '中风险', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', trackBg: 'bg-amber-100 dark:bg-amber-900/30' },
  high: { label: '高风险', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', trackBg: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: '极高风险', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', trackBg: 'bg-red-100 dark:bg-red-900/30' },
};

export const RiskIndicator = memo(function RiskIndicator({ component, onEvent }: Props) {
  const { data } = component;
  const config = levelConfig[data.level];
  const maxScore = data.maxScore || 100;
  const percentage = Math.min((data.score / maxScore) * 100, 100);

  return (
    <div className={cn(
      'a2ui-risk-indicator bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4',
      component.className,
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {data.title}
        </h4>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', config.trackBg, config.color)}>
          {config.label}
        </span>
      </div>

      {/* 评分环 */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* 背景圆 */}
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-zinc-100 dark:stroke-zinc-800" />
            {/* 进度圆 */}
            <circle
              cx="50" cy="50" r="42"
              fill="none" strokeWidth="8" strokeLinecap="round"
              className={cn('transition-all duration-1000', config.bg.replace('bg-', 'stroke-'))}
              strokeDasharray={`${percentage * 2.64} ${264 - percentage * 2.64}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-bold', config.color)}>{data.score}</span>
            <span className="text-[10px] text-zinc-400">/{maxScore}</span>
          </div>
        </div>

        {/* 描述 + 子指标 */}
        <div className="flex-1">
          {data.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
              {data.description}
            </p>
          )}
          {data.factors && (
            <div className="space-y-2">
              {data.factors.map((factor, i) => {
                const factorConfig = levelConfig[factor.level];
                const factorPct = (factor.score / factor.maxScore) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-zinc-500">{factor.label}</span>
                      <span className={cn('text-[11px] font-medium', factorConfig.color)}>
                        {factor.score}/{factor.maxScore}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', factorConfig.bg)}
                        style={{ width: `${factorPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 操作 */}
      {data.action && (
        <button
          onClick={() => onEvent({
            type: 'action',
            actionId: data.action!.actionId,
            componentId: component.id,
          })}
          className="w-full mt-4 py-2.5 rounded-xl text-xs font-medium bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition"
        >
          {data.action.label}
        </button>
      )}
    </div>
  );
});
