/**
 * ThinkingIndicator — 内联 Agent 状态指示器
 * 
 * 在消息流中紧凑展示 Agent 工作状态，不打开右侧面板。
 * - 单 Agent：显示名称 + 动画脉冲
 * - 多 Agent：显示步骤进度 (1/3 完成)
 */

import { motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';

export interface ThinkingStatus {
  agent: string;
  message: string;
  step?: number;
  totalSteps?: number;
}

interface ThinkingIndicatorProps {
  status: ThinkingStatus | null;
}

export function ThinkingIndicator({ status }: ThinkingIndicatorProps) {
  if (!status) return null;

  const hasProgress = status.step != null && status.totalSteps != null && status.totalSteps > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 max-w-fit"
    >
      {/* 脉冲动画圆点 */}
      <div className="relative flex-shrink-0">
        <Bot className="w-4 h-4 text-blue-600" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      </div>

      {/* Agent 名称和消息 */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-semibold text-blue-700 truncate">
          {status.agent}
        </span>
        <span className="text-xs text-blue-500 truncate">
          {status.message}
        </span>
      </div>

      {/* 进度指示 */}
      {hasProgress && (
        <span className="flex-shrink-0 text-[10px] font-medium text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded">
          {status.step}/{status.totalSteps}
        </span>
      )}

      {/* 旋转加载器 */}
      <Loader2 className="w-3 h-3 animate-spin text-blue-400 flex-shrink-0" />
    </motion.div>
  );
}
