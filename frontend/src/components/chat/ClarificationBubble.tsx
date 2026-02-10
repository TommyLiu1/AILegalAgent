/**
 * ClarificationBubble — 引导式问答气泡组件
 * 
 * 核心功能：
 * 1. 选择后立即锁定（不可修改、不可多选）
 * 2. 提交后不再输出选择内容到对话流（直接显示"已确认"状态）
 * 3. 提交后的选择以紧凑标签形式展示，不重复出现
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, HelpCircle, Sparkles, ChevronRight } from 'lucide-react';

interface ClarificationBubbleProps {
  message: string;
  questions: { question: string; options: string[] }[];
  originalContent: string;
  onSubmit?: (originalContent: string, selections: Record<string, string>) => void;
  disabled: boolean;
}

export function ClarificationBubble({
  message,
  questions,
  originalContent,
  onSubmit,
  disabled,
}: ClarificationBubbleProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (question: string, option: string) => {
    // 已提交或已有选择时不可更改（单选锁定）
    if (submitted || selections[question]) return;
    setSelections(prev => ({ ...prev, [question]: option }));
  };

  const handleSubmit = () => {
    if (submitted || disabled) return;
    const valid = Object.fromEntries(Object.entries(selections).filter(([_, v]) => v));
    if (Object.keys(valid).length === 0) return;
    setSubmitted(true);
    // 直接发送到后端，不在对话流中重复输出选择文字
    onSubmit?.(originalContent, valid);
  };

  const answeredCount = Object.values(selections).filter(v => v).length;
  const allAnswered = answeredCount === questions.length;

  // 提交后的紧凑视图
  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
        <div className="flex flex-col gap-1 max-w-[80%]">
          <div className="bg-green-50/60 border border-green-100 rounded-2xl rounded-tl-none px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold text-green-700">已确认需求</span>
              <Loader2 className="w-3 h-3 animate-spin text-green-500" />
              <span className="text-[10px] text-green-500">处理中...</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(selections).filter(([_, v]) => v).map(([q, a]) => (
                <span key={q} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-[11px] text-gray-700 border border-green-200">
                  <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
        <HelpCircle className="h-4 w-4 text-amber-500" />
      </div>
      <div className="flex flex-col gap-1.5 max-w-[85%]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 ml-1">
          <Sparkles className="h-3 w-3 text-amber-500" /> 需求确认
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3.5 shadow-sm">
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{message}</p>
          <div className="space-y-3">
            {questions.map((q, qi) => {
              const isAnswered = !!selections[q.question];
              return (
                <div key={qi}>
                  <p className="text-xs font-medium text-gray-800 mb-1.5">{q.question}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt, oi) => {
                      const isSelected = selections[q.question] === opt;
                      const isLocked = isAnswered && !isSelected;
                      return (
                        <button
                          key={oi}
                          onClick={() => handleSelect(q.question, opt)}
                          disabled={isLocked}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]'
                              : isLocked
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 cursor-pointer active:scale-95'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {/* 确认按钮 — 仅全部选择后显示 */}
          <AnimatePresence>
            {allAnswered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <button
                  onClick={handleSubmit}
                  disabled={disabled}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
                >
                  <span>确认并继续</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {!allAnswered && (
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              请逐一选择 · 已完成 {answeredCount}/{questions.length}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
