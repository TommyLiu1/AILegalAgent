/**
 * 分析视图 Tab
 * 
 * 组合现有的 RiskRadar、DocumentDiff、KnowledgeGraphView 组件
 * 提供统一的垂直堆叠布局
 */

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Shield, FileSearch, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { RiskRadar } from './RiskRadar';
import { DocumentDiff } from './DocumentDiff';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import type { AnalysisData } from '@/lib/store';

interface AnalysisViewProps {
  data: AnalysisData;
}

export const AnalysisView = memo(function AnalysisView({ data }: AnalysisViewProps) {
  const hasAny = data.riskRadar || data.documentDiff || data.knowledgeGraph;

  if (!hasAny) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 px-8">
          <div className="w-20 h-20 mx-auto bg-slate-200 rounded-full flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-slate-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-2">分析视图</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              合同审查、风险评估完成后<br />将在此展示专业分析结果
            </p>
          </div>
          <div className="pt-4 flex flex-wrap gap-2 justify-center">
            {['风险雷达', '文档对比', '知识图谱', '舆情分析'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 border border-slate-200">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {data.riskRadar && (
        <AnalysisSection
          title="风险雷达"
          icon={Shield}
          iconColor="text-red-600 bg-red-50"
          defaultOpen
        >
          <RiskRadar data={data.riskRadar} />
        </AnalysisSection>
      )}

      {data.documentDiff && (
        <AnalysisSection
          title="文档对比"
          icon={FileSearch}
          iconColor="text-blue-600 bg-blue-50"
          defaultOpen
        >
          <DocumentDiff />
        </AnalysisSection>
      )}

      {data.knowledgeGraph && (
        <AnalysisSection
          title="知识图谱"
          icon={GitBranch}
          iconColor="text-purple-600 bg-purple-50"
          defaultOpen
        >
          <div className="h-[400px]">
            <KnowledgeGraphView data={data.knowledgeGraph} />
          </div>
        </AnalysisSection>
      )}
    </div>
  );
});


// ========== 折叠分析块 ==========
function AnalysisSection({
  title,
  icon: Icon,
  iconColor,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className={`p-1.5 rounded-lg ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-gray-800 flex-1 text-left">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
