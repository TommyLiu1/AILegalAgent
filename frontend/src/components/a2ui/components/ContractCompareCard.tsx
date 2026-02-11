/**
 * 合同条款对比卡片
 * 对比两个版本的合同条款差异，高亮变更部分
 * 
 * 用于：合同审查、修改建议、版本对比
 */

import { memo, useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, Minus } from 'lucide-react';
import type { A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

export interface ContractCompareData {
  title: string;
  subtitle?: string;
  /** 对比双方名称 */
  leftLabel: string;
  rightLabel: string;
  /** 差异条款列表 */
  clauses: ClauseDiff[];
  /** 总结 */
  summary?: {
    totalClauses: number;
    changedClauses: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  };
  /** 操作按钮 */
  actions?: {
    label: string;
    actionId: string;
    variant?: 'primary' | 'secondary' | 'outline';
  }[];
}

interface ClauseDiff {
  id: string;
  clauseTitle: string;
  /** 变更类型 */
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  /** 左侧（原始）内容 */
  leftContent?: string;
  /** 右侧（新版）内容 */
  rightContent?: string;
  /** 风险等级 */
  riskLevel?: 'low' | 'medium' | 'high';
  /** AI 点评 */
  comment?: string;
}

export interface ContractCompareCardComponent {
  id: string;
  type: 'contract-compare';
  data: ContractCompareData;
  visible?: boolean;
  className?: string;
}

interface Props {
  component: ContractCompareCardComponent;
  onEvent: A2UIEventHandler;
}

const changeTypeConfig = {
  added: { label: '新增', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  removed: { label: '删除', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  modified: { label: '修改', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle },
  unchanged: { label: '未变', color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700', icon: Minus },
};

const riskColors = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-amber-600 bg-amber-50',
  high: 'text-red-600 bg-red-50',
};

export const ContractCompareCard = memo(function ContractCompareCard({ component, onEvent }: Props) {
  const { data } = component;
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  const toggleClause = (id: string) => {
    setExpandedClauses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={cn(
      'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden',
      component.className,
    )}>
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30">
        <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{data.title}</h3>
        {data.subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{data.subtitle}</p>
        )}
      </div>

      {/* 摘要 */}
      {data.summary && (
        <div className="px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-4 text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">
            共 <strong>{data.summary.totalClauses}</strong> 条 · 变更 <strong>{data.summary.changedClauses}</strong> 条
          </span>
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', riskColors[data.summary.riskLevel])}>
            风险: {data.summary.riskLevel === 'low' ? '低' : data.summary.riskLevel === 'medium' ? '中' : '高'}
          </span>
          {data.summary.recommendation && (
            <span className="text-zinc-500 dark:text-zinc-400 flex-1 truncate">{data.summary.recommendation}</span>
          )}
        </div>
      )}

      {/* 对比列头 */}
      <div className="grid grid-cols-[1fr,1fr] gap-0 px-4 py-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
        <span>{data.leftLabel}</span>
        <span>{data.rightLabel}</span>
      </div>

      {/* 条款对比列表 */}
      <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
        {data.clauses.map((clause) => {
          const config = changeTypeConfig[clause.changeType];
          const ChangeIcon = config.icon;
          const isExpanded = expandedClauses.has(clause.id);

          return (
            <div key={clause.id} className="group">
              {/* 条款标题行 */}
              <button
                onClick={() => toggleClause(clause.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <ChangeIcon className={cn('w-3.5 h-3.5 flex-shrink-0', config.color.split(' ')[0])} />
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex-1">{clause.clauseTitle}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', config.color)}>
                  {config.label}
                </span>
                {clause.riskLevel && clause.riskLevel !== 'low' && (
                  <AlertTriangle className={cn('w-3 h-3', clause.riskLevel === 'high' ? 'text-red-500' : 'text-amber-500')} />
                )}
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />}
              </button>

              {/* 展开的对比内容 */}
              {isExpanded && (
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 左侧（原始） */}
                    <div className={cn(
                      'p-3 rounded-lg text-xs leading-relaxed',
                      clause.changeType === 'removed' ? 'bg-red-50/50 text-red-800 line-through' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300',
                    )}>
                      {clause.leftContent || <span className="text-zinc-400 dark:text-zinc-500 italic">（无）</span>}
                    </div>
                    {/* 右侧（新版） */}
                    <div className={cn(
                      'p-3 rounded-lg text-xs leading-relaxed',
                      clause.changeType === 'added' ? 'bg-green-50/50 text-green-800' : 
                      clause.changeType === 'modified' ? 'bg-amber-50/50 text-amber-800' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300',
                    )}>
                      {clause.rightContent || <span className="text-zinc-400 dark:text-zinc-500 italic">（无）</span>}
                    </div>
                  </div>
                  {/* AI 点评 */}
                  {clause.comment && (
                    <div className="mt-2 px-3 py-2 bg-blue-50/50 rounded-lg flex items-start gap-2">
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">AI</span>
                      <p className="text-[11px] text-blue-800 leading-relaxed">{clause.comment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 操作按钮 */}
      {data.actions && data.actions.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 justify-end">
          {data.actions.map((action) => (
            <button
              key={action.actionId}
              onClick={() => onEvent({
                type: 'action',
                actionId: action.actionId,
                componentId: component.id,
              })}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-95',
                action.variant === 'primary'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : action.variant === 'outline'
                  ? 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
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
