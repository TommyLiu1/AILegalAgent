/**
 * AI 行内建议组件
 * 
 * 在 Canvas 编辑器中显示 AI 的修改建议，支持接受/拒绝
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, MessageSquare } from 'lucide-react';
import type { CanvasSuggestion } from '@/lib/store';

interface InlineSuggestionProps {
  suggestion: CanvasSuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export const InlineSuggestion = memo(function InlineSuggestion({
  suggestion,
  onAccept,
  onReject,
}: InlineSuggestionProps) {
  if (suggestion.status !== 'pending') return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="border-l-2 border-amber-400 bg-amber-50/50 rounded-r-lg p-3 my-1"
    >
      {/* 原文 */}
      <div className="text-xs">
        <span className="text-gray-400 font-medium">原文：</span>
        <span className="text-red-600 line-through ml-1">{suggestion.original}</span>
      </div>

      {/* 建议 */}
      <div className="text-xs mt-1">
        <span className="text-gray-400 font-medium">建议：</span>
        <span className="text-green-700 font-medium ml-1">{suggestion.suggested}</span>
      </div>

      {/* 理由 */}
      {suggestion.reason && (
        <div className="flex items-start gap-1 mt-1.5 text-[10px] text-gray-500">
          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{suggestion.reason}</span>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-1.5 mt-2">
        <button
          onClick={() => onAccept(suggestion.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
        >
          <Check className="w-3 h-3" />
          接受
        </button>
        <button
          onClick={() => onReject(suggestion.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          <X className="w-3 h-3" />
          忽略
        </button>
      </div>
    </motion.div>
  );
});
