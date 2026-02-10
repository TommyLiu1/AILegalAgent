/**
 * 合同预览卡片
 * 展示待签署合同的概要和风险信息
 */

import { memo } from 'react';
import { FileText, AlertTriangle, CheckCircle, Info, Users } from 'lucide-react';
import type { ContractPreviewComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: ContractPreviewComponent;
  onEvent: A2UIEventHandler;
}

const riskLevelConfig = {
  low: { label: '低风险', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle },
  medium: { label: '中风险', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Info },
  high: { label: '高风险', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertTriangle },
};

export const ContractPreview = memo(function ContractPreview({ component, onEvent }: Props) {
  const { data } = component;
  const riskConfig = riskLevelConfig[data.riskLevel];
  const RiskIcon = riskConfig.icon;

  return (
    <div className={cn(
      'a2ui-contract-preview bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden',
      component.className,
    )}>
      {/* 头部 */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {data.title}
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">{data.type}</p>
        </div>
        <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full', riskConfig.bg)}>
          <RiskIcon className={cn('w-3.5 h-3.5', riskConfig.color)} />
          <span className={cn('text-[10px] font-semibold', riskConfig.color)}>{riskConfig.label}</span>
        </div>
      </div>

      {/* 签约方 */}
      {data.parties.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500 font-medium">签约方</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.parties.map((party, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs">
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{party.name}</span>
                <span className="text-zinc-400">({party.role})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 关键条款 */}
      {data.keyTerms.length > 0 && (
        <div className="mx-4 border-t border-zinc-100 dark:border-zinc-800 py-2">
          {data.keyTerms.map((term, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-zinc-500">{term.label}</span>
              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{term.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 风险项 */}
      {data.riskItems && data.riskItems.length > 0 && (
        <div className="mx-4 border-t border-zinc-100 dark:border-zinc-800 py-3">
          <p className="text-xs text-zinc-500 font-medium mb-2">风险提示</p>
          <div className="space-y-1.5">
            {data.riskItems.map((risk, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                  risk.level === 'high' && 'bg-red-500',
                  risk.level === 'medium' && 'bg-amber-500',
                  risk.level === 'low' && 'bg-green-500',
                )} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {risk.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {data.actions.length > 0 && (
        <div className="flex gap-2 p-4 border-t border-zinc-100 dark:border-zinc-800">
          {data.actions.map((action) => (
            <button
              key={action.actionId}
              onClick={() => onEvent({
                type: 'action',
                actionId: action.actionId,
                componentId: component.id,
                payload: { contractId: data.contractId },
              })}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]',
                action.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
                action.variant === 'secondary' && 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                action.variant === 'outline' && 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300',
                !action.variant && 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
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
