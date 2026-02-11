/**
 * QuickActionsBar — 快捷操作工具栏 (v6 — 千问/豆包增强版)
 * 
 * 设计理念：
 * - 快捷操作标签：点击后 **填充到输入框** 并高亮选中态，用户补充需求后再发送
 * - **NEW** 功能模式切换药丸：水平滚动药丸切换 AI 工作模式（参考千问/豆包）
 * - 默认只显示一行（桌面 5 个 / 移动 3 个），其余收入"更多"
 * - 标签列表未来可从后端/设置动态加载（技能扩展）
 * - 深度思考开关独立导出为 DeepThinkToggle，由 Chat.tsx 放到输入框内部
 * - 处理中时淡出隐藏
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, FileText, PenTool, Shield, MessageCircle, Search,
  ChevronDown, ChevronUp, Briefcase, BookOpen,
  Brain, Zap,
} from 'lucide-react';

/** 功能模式（传给后端 Coordinator）：仅保留两种 — 普通对话 / 专业模式（深度分析） */
export type QuickActionMode = 'chat' | 'deep_analysis';

/** 快捷操作定义 */
export interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  /** 点击后填充到输入框的提示文本 */
  query: string;
}

/**
 * 默认快捷操作列表
 * 
 * 未来可从后端 API 或用户设置中动态加载，
 * 实现 skills/agents 的前端业务扩展。
 */
const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-consult',    label: '法律咨询', icon: MessageCircle, query: '我想咨询一个法律问题：' },
  { id: 'qa-contract',   label: '合同审查', icon: FileText,      query: '请帮我审查这份合同：' },
  { id: 'qa-draft',      label: '文书起草', icon: PenTool,        query: '请帮我起草一份' },
  { id: 'qa-risk',       label: '风险评估', icon: Shield,         query: '请帮我做风险评估：' },
  { id: 'qa-dd',         label: '尽职调查', icon: Search,         query: '请帮我做尽职调查，目标公司：' },
  { id: 'qa-labor',      label: '劳动人事', icon: Users,          query: '我有一个劳动人事问题：' },
  { id: 'qa-regulation', label: '法规解读', icon: BookOpen,       query: '请帮我解读以下法规政策：' },
  { id: 'qa-litigation', label: '诉讼策略', icon: Briefcase,      query: '请帮我分析诉讼策略：' },
];

// ========== 快捷操作标签栏 ==========

interface QuickActionsBarProps {
  /** 用户点击快捷操作后：填充文本到输入框（不直接发送） */
  onFillInput: (text: string) => void;
  isProcessing: boolean;
  isMobile: boolean;
  /** 可选：外部传入的操作列表（支持动态扩展） */
  actions?: QuickAction[];
  /** 当前选中的标签 ID（用于高亮） */
  activeActionId?: string | null;
}

export function QuickActionsBar({
  onFillInput,
  isProcessing,
  isMobile,
  actions,
  activeActionId,
}: QuickActionsBarProps) {
  const [expanded, setExpanded] = useState(false);

  const quickActions = actions || DEFAULT_QUICK_ACTIONS;

  // 默认显示数量：桌面端一行放 5 个，移动端 3 个
  const defaultVisibleCount = isMobile ? 3 : 5;
  const visibleActions = expanded ? quickActions : quickActions.slice(0, defaultVisibleCount);
  const hasMore = quickActions.length > defaultVisibleCount;

  return (
    <AnimatePresence>
      {!isProcessing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {visibleActions.map((action) => {
              const Icon = action.icon;
              const isActive = activeActionId === action.id;
              return (
                <motion.button
                  key={action.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => onFillInput(action.query)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all active:scale-95 shadow-sm border ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-blue-300 ring-1 ring-blue-200'
                      : 'text-gray-600 bg-white border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{action.label}</span>
                </motion.button>
              );
            })}
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                {expanded ? (
                  <>收起 <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>更多 <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ========== 深度思考/专业模式开关（整合原药丸为两种模式：普通 | 专业，由 Chat 放入输入框内） ==========

interface DeepThinkToggleProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * 深度思考开关按钮
 * 
 * 设计为嵌入输入框内部右侧使用，发送按钮左侧。
 * 紧凑的胶囊形态，激活时紫色高亮。
 */
export function DeepThinkToggle({ isActive, onToggle, disabled }: DeepThinkToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={isActive ? '关闭深度思考' : '开启深度思考：多智能体协作 · 深度分析 · 联网搜索'}
      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg transition-all duration-200 flex-shrink-0 whitespace-nowrap disabled:opacity-40 ${
        isActive
          ? 'bg-purple-100 text-purple-600 hover:bg-purple-150'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      {isActive ? (
        <Brain className="w-3.5 h-3.5" />
      ) : (
        <Zap className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">深度思考</span>
      {/* 开关指示圆点 */}
      <span className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
        isActive ? 'bg-purple-500' : 'bg-gray-300'
      }`} />
    </button>
  );
}
