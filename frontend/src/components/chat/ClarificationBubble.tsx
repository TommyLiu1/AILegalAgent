/**
 * ClarificationBubble — 引导式问答气泡组件 (v2)
 * 
 * 核心改进：
 * 1. 选择后可点击取消重选（不再单选锁定）
 * 2. 至少选择 1 项即可显示确认按钮（不需要全部选完）
 * 3. 确认按钮始终可见且醒目，提示未完成的选项
 * 4. 允许用户在底部输入补充说明
 * 5. 提交后的选择以紧凑标签形式展示
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, HelpCircle, Sparkles, ChevronRight, RotateCcw, MessageSquarePlus } from 'lucide-react';

interface ClarificationBubbleProps {
  message: string;
  questions: { question: string; options: string[] }[];
  originalContent: string;
  onSubmit?: (originalContent: string, selections: Record<string, string>, supplement?: string) => void;
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
  const [supplement, setSupplement] = useState('');
  const [showSupplement, setShowSupplement] = useState(false);
  const supplementRef = useRef<HTMLTextAreaElement>(null);

  const handleSelect = (question: string, option: string) => {
    if (submitted) return;
    setSelections(prev => {
      // 点击已选中的选项 → 取消选择
      if (prev[question] === option) {
        const next = { ...prev };
        delete next[question];
        return next;
      }
      // 选择新选项
      return { ...prev, [question]: option };
    });
  };

  const handleSubmit = () => {
    if (submitted || disabled) return;
    const valid = Object.fromEntries(Object.entries(selections).filter(([_, v]) => v));
    if (Object.keys(valid).length === 0) return;
    setSubmitted(true);
    onSubmit?.(originalContent, valid, supplement.trim() || undefined);
  };

  const answeredCount = Object.values(selections).filter(v => v).length;
  const allAnswered = answeredCount === questions.length;
  const hasAnyAnswer = answeredCount > 0;

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
            {supplement && (
              <p className="mt-2 text-[11px] text-green-700 bg-white/60 px-2 py-1 rounded-lg border border-green-100">
                补充：{supplement}
              </p>
            )}
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
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <p className="text-xs font-medium text-gray-800">{q.question}</p>
                    {isAnswered && (
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt, oi) => {
                      const isSelected = selections[q.question] === opt;
                      return (
                        <button
                          key={oi}
                          onClick={() => handleSelect(q.question, opt)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          {opt}
                          {isSelected && (
                            <span className="ml-1 text-[10px] opacity-70">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 补充说明输入区 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            {!showSupplement ? (
              <button
                onClick={() => {
                  setShowSupplement(true);
                  setTimeout(() => supplementRef.current?.focus(), 100);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors"
              >
                <MessageSquarePlus className="w-3 h-3" />
                添加补充说明（可选）
              </button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <textarea
                    ref={supplementRef}
                    value={supplement}
                    onChange={(e) => setSupplement(e.target.value)}
                    placeholder="补充需求说明，如预算范围、时间要求、特殊情况等..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* 确认按钮 — 至少选择 1 项即显示 */}
          <div className="mt-3">
            <button
              onClick={handleSubmit}
              disabled={disabled || !hasAnyAnswer}
              className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98] shadow-sm ${
                hasAnyAnswer
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {hasAnyAnswer ? (
                <>
                  <span>确认并继续</span>
                  {!allAnswered && (
                    <span className="text-[10px] opacity-80 ml-1">({answeredCount}/{questions.length})</span>
                  )}
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <span>请先选择选项</span>
              )}
            </button>
          </div>

          {/* 进度提示 */}
          {!allAnswered && hasAnyAnswer && (
            <p className="text-[10px] text-blue-500 mt-1.5 text-center">
              还有 {questions.length - answeredCount} 项未选择，也可以直接确认
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
