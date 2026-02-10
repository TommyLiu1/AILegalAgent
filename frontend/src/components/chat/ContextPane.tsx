import { ContextContent } from './ChatCanvas';
import { RiskRadar } from './RiskRadar';
import { DocumentDiff } from './DocumentDiff';
import { A2UIRenderer } from './A2UIRenderer';
import { FileSearch, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ContextPaneProps {
  content: ContextContent;
}

export function ContextPane({ content }: ContextPaneProps) {
  if (content.type === 'idle') {
    // ... (idle implementation)
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 px-8">
          <div className="w-20 h-20 mx-auto bg-slate-200 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-slate-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-2">A2UI 动态绘图</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              此区域将根据 AI 分析结果<br />动态渲染专业组件
            </p>
          </div>
          <div className="pt-4 flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 border border-slate-200">
              证据链图谱
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 border border-slate-200">
              风险雷达
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 border border-slate-200">
              文档对比
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 border border-slate-200">
              聚焦分析
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (content.type === 'a2ui') {
    return <A2UIRenderer data={content.data} />;
  }

  if (content.type === 'document-preview') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full p-6"
      >
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileSearch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">文档分析中</h3>
              <p className="text-sm text-slate-500">{content.data?.fileName}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">页数</span>
              <span className="font-medium text-slate-900">{content.data?.pages} 页</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">检测到的风险点</span>
              <span className="font-medium text-amber-600">{content.data?.detectedIssues} 处</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.5, delay: i * 0.3 }}
                    className="h-full bg-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (content.type === 'risk-radar') {
    return <RiskRadar data={content.data} />;
  }

  if (content.type === 'document-diff') {
    return <DocumentDiff />;
  }

  return null;
}
