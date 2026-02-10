/**
 * 步骤进度组件
 * 用于展示工作流进度
 */

import { memo } from 'react';
import { Check, Circle, AlertCircle, SkipForward } from 'lucide-react';
import type { ProgressStepsComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: ProgressStepsComponent;
  onEvent: A2UIEventHandler;
}

const stepStatusConfig = {
  pending: { icon: Circle, color: 'text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800', line: 'bg-zinc-200 dark:bg-zinc-700' },
  active: { icon: Circle, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', line: 'bg-blue-200 dark:bg-blue-800' },
  completed: { icon: Check, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', line: 'bg-green-400 dark:bg-green-600' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', line: 'bg-red-200 dark:bg-red-800' },
  skipped: { icon: SkipForward, color: 'text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800', line: 'bg-zinc-200 dark:bg-zinc-700' },
};

export const ProgressSteps = memo(function ProgressSteps({ component, onEvent }: Props) {
  const { data } = component;
  const isVertical = data.direction === 'vertical';

  return (
    <div className={cn(
      'a2ui-progress-steps bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4',
      component.className,
    )}>
      {data.title && (
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4">{data.title}</h4>
      )}

      <div className={cn(
        isVertical ? 'flex flex-col' : 'flex items-start',
      )}>
        {data.steps.map((step, i) => {
          const config = stepStatusConfig[step.status];
          const Icon = config.icon;
          const isLast = i === data.steps.length - 1;

          if (isVertical) {
            return (
              <div key={step.id} className="flex gap-3">
                {/* 图标 + 连接线 */}
                <div className="flex flex-col items-center">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', config.bg)}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>
                  {!isLast && (
                    <div className={cn('w-0.5 flex-1 min-h-[24px] my-1', config.line)} />
                  )}
                </div>
                {/* 内容 */}
                <div className="pb-4">
                  <p className={cn(
                    'text-sm font-medium',
                    step.status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300',
                  )}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-zinc-400 mt-0.5">{step.description}</p>
                  )}
                  {step.timestamp && (
                    <p className="text-[10px] text-zinc-400 mt-0.5">{step.timestamp}</p>
                  )}
                </div>
              </div>
            );
          }

          // 水平方向
          return (
            <div key={step.id} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                {i > 0 && <div className={cn('flex-1 h-0.5', stepStatusConfig[data.steps[i - 1].status].line)} />}
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                {!isLast && <div className={cn('flex-1 h-0.5', config.line)} />}
              </div>
              <p className={cn(
                'text-[11px] mt-2 text-center',
                step.status === 'active' ? 'text-blue-600 font-medium dark:text-blue-400' : 'text-zinc-500',
              )}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});
