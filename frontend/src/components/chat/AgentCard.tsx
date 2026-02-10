/**
 * Agent 中间结果卡片组件
 * 
 * 展示单个 Agent 完成的工作结果，带时间线连接
 */

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ChevronDown, ChevronUp, Clock, Scale, FileSearch, Shield, Brain, Gavel, BookOpen, AlertTriangle, FileText, Search, Building, Landmark, Briefcase, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { AgentResult } from '@/lib/store';

const agentIcons: Record<string, { icon: React.ElementType; color: string }> = {
  '法律顾问Agent': { icon: Scale, color: 'bg-blue-50 text-blue-600' },
  '合同审查Agent': { icon: FileSearch, color: 'bg-green-50 text-green-600' },
  '尽职调查Agent': { icon: Search, color: 'bg-cyan-50 text-cyan-600' },
  '法律研究Agent': { icon: BookOpen, color: 'bg-indigo-50 text-indigo-600' },
  '文书起草Agent': { icon: FileText, color: 'bg-violet-50 text-violet-600' },
  '合规审查Agent': { icon: Shield, color: 'bg-emerald-50 text-emerald-600' },
  '风险评估Agent': { icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
  '诉讼策略Agent': { icon: Gavel, color: 'bg-red-50 text-red-600' },
  '知识产权Agent': { icon: Landmark, color: 'bg-pink-50 text-pink-600' },
  '监管监测Agent': { icon: Eye, color: 'bg-orange-50 text-orange-600' },
  '税务合规Agent': { icon: Building, color: 'bg-teal-50 text-teal-600' },
  '劳动合规Agent': { icon: Briefcase, color: 'bg-sky-50 text-sky-600' },
  '协调调度Agent': { icon: Brain, color: 'bg-purple-50 text-purple-600' },
};

interface AgentCardProps {
  result: AgentResult;
  index: number;
  isLast: boolean;
}

export const AgentCard = memo(function AgentCard({ result, index, isLast }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const iconConfig = agentIcons[result.agent] || { icon: Brain, color: 'bg-gray-50 text-gray-600' };
  const Icon = iconConfig.icon;

  const preview = result.content.slice(0, 150);
  const hasMore = result.content.length > 150;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex gap-3"
    >
      {/* 时间线 */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-8 h-8 rounded-full ${iconConfig.color} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{result.agent}</span>
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          </div>
          {result.elapsed !== undefined && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-3 h-3" />
              {result.elapsed}s
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <div className="prose prose-xs max-w-none text-gray-600 leading-relaxed">
            <ReactMarkdown>{expanded ? result.content : preview + (hasMore ? '...' : '')}</ReactMarkdown>
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  展开完整结果
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
          <span>步骤 {result.step}/{result.totalSteps}</span>
        </div>
      </div>
    </motion.div>
  );
});
