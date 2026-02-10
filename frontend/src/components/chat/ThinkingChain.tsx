/**
 * 思考链/推理过程组件 — 保留原有交互风格
 * 
 * 设计参考截图：
 * - 头部：「思考过程（N 步）▽」可折叠
 * - 每一步：圆形图标 + Agent 名称（加粗）+ 阶段标签（彩色 pill）
 * - 内容区：Markdown 渲染，结构化字段展示
 * - 步骤间有连接线
 * - 思考中时显示动态指示
 * - 默认展开，可手动收拢
 */

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, Target, Loader2, Settings, CheckCircle2 } from 'lucide-react';
import type { ThinkingStep } from '@/lib/store';
import ReactMarkdown from 'react-markdown';

interface ThinkingChainProps {
  steps: ThinkingStep[];
  isThinking: boolean;
}

const phaseConfig: Record<string, { label: string; icon: React.ElementType; iconColor: string; badgeColor: string }> = {
  requirement: {
    label: '需求分析',
    icon: Target,
    iconColor: 'text-amber-500 bg-amber-50 border-amber-200',
    badgeColor: 'text-amber-600 bg-amber-50 border border-amber-200',
  },
  planning: {
    label: 'DAG 规划',
    icon: Settings,
    iconColor: 'text-blue-500 bg-blue-50 border-blue-200',
    badgeColor: 'text-blue-600 bg-blue-50 border border-blue-200',
  },
  execution: {
    label: '推理过程',
    icon: Brain,
    iconColor: 'text-purple-500 bg-purple-50 border-purple-200',
    badgeColor: 'text-purple-600 bg-purple-50 border border-purple-200',
  },
  result: {
    label: '执行完成',
    icon: CheckCircle2,
    iconColor: 'text-green-500 bg-green-50 border-green-200',
    badgeColor: 'text-green-600 bg-green-50 border border-green-200',
  },
};

export const ThinkingChain = memo(function ThinkingChain({
  steps,
  isThinking,
}: ThinkingChainProps) {
  const [expanded, setExpanded] = useState(true);

  if (steps.length === 0 && !isThinking) return null;

  return (
    <div className="mx-4 md:mx-8 mb-3">
      {/* 头部 — 「思考过程（N 步）▽」 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors py-1.5 group"
      >
        {/* 思考图标 */}
        <div className="relative flex-shrink-0">
          <Brain className={`w-4 h-4 ${isThinking ? 'text-blue-500' : 'text-gray-400'}`} />
          {isThinking && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          )}
        </div>

        <span className="font-semibold text-gray-700">思考过程</span>
        <span className="text-gray-400">（{steps.length} 步）</span>

        {isThinking && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
        )}

        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </motion.div>
      </button>

      {/* 展开内容 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-2 pl-4 border-l-2 border-dashed border-gray-200 space-y-4 mt-1 pb-1">
              {steps.map((step, index) => {
                const config = phaseConfig[step.phase] || phaseConfig.execution;
                const Icon = config.icon;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.3 }}
                    className="flex gap-3 items-start relative"
                  >
                    {/* 左侧连接线上的圆形图标 */}
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 -ml-[30px] bg-white ${config.iconColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* 右侧内容 */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      {/* Agent 名称 + 阶段标签 */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-gray-800">
                          {step.agent || '分析'}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${config.badgeColor}`}>
                          {config.label}
                        </span>
                      </div>

                      {/* 思考内容 — Markdown 渲染 */}
                      <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none prose-p:my-0.5 prose-p:text-gray-600 prose-strong:text-gray-800 prose-strong:font-semibold prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
                        <ReactMarkdown>{step.content}</ReactMarkdown>
                      </div>

                      {/* DAG 规划步骤（如果有） */}
                      {step.planSteps && step.planSteps.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {step.planSteps.map((ps, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0 mt-0.5">
                                {i + 1}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-700">{ps.agent}</span>
                                {ps.instruction && (
                                  <span className="ml-1 text-gray-400">{ps.instruction}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* 思考中状态指示 */}
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2.5 relative"
                >
                  <div className="w-7 h-7 rounded-full border border-blue-200 bg-blue-50 flex items-center justify-center flex-shrink-0 -ml-[30px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  </div>
                  <span className="text-sm text-blue-500 font-medium">正在推理...</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
