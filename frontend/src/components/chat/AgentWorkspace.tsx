/**
 * 智能体工作台 v2 — 多 Agent 并列协作 + 交互式面板
 * 
 * 功能区域（自上而下）：
 * 1. 需求分析卡片 — 来自需求分析 Agent
 * 2. 需求确认交互卡片 — 单选/多选，由左侧对话触发
 * 3. Agent 协作看板 — 多 Agent 卡片式并列展示运行状态与进度
 * 4. Agent 执行结果时间线 — 已完成任务的结果
 * 5. 动作按钮区 — 系统或 Agent 推送的快捷操作
 * 6. A2UI 动态组件 — 由 Agent 推送的自定义 UI
 */

import { memo, useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, Send, MessageSquarePlus } from 'lucide-react';
import { RequirementCard } from './RequirementCard';
import { AgentCard } from './AgentCard';
import { AgentTaskBoard } from './AgentTaskBoard';
import { WorkspaceConfirmationCard } from './WorkspaceConfirmationCard';
import { WorkspaceActionBar } from './WorkspaceActionBar';
import { A2UIRenderer } from './A2UIRenderer';
import { ContractReviewCard } from './ContractReviewCard';
import { useChatStore } from '@/lib/store';
import type { AgentResult, ThinkingStep, RequirementAnalysis } from '@/lib/store';

interface AgentWorkspaceProps {
  agentResults: AgentResult[];
  thinkingSteps: ThinkingStep[];
  requirementAnalysis: RequirementAnalysis | null;
  a2uiData: any;
  isProcessing: boolean;
  onWorkspaceConfirm?: (confirmationId: string, selectedIds: string[]) => void;
  onWorkspaceAction?: (actionId: string, payload?: any) => void;
  /** 补充输入回调 — 用户在工作台输入补充信息后发送到对话流 */
  onSupplementInput?: (text: string) => void;
}

export const AgentWorkspace = memo(function AgentWorkspace({
  agentResults,
  thinkingSteps,
  requirementAnalysis,
  a2uiData,
  isProcessing,
  onWorkspaceConfirm,
  onWorkspaceAction,
  onSupplementInput,
}: AgentWorkspaceProps) {
  const store = useChatStore();
  const { workspaceConfirmations, workspaceActions, agentTasks } = store;
  const [supplementText, setSupplementText] = useState('');
  const [showSupplementInput, setShowSupplementInput] = useState(false);
  const supplementInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSupplementSend = useCallback(() => {
    const text = supplementText.trim();
    if (!text || isProcessing) return;
    onSupplementInput?.(text);
    setSupplementText('');
    setShowSupplementInput(false);
  }, [supplementText, isProcessing, onSupplementInput]);

  // 判断是否有内容
  const hasConfirmations = workspaceConfirmations.length > 0;
  const hasActions = workspaceActions.length > 0;
  const hasTasks = agentTasks.length > 0;
  const isEmpty = !requirementAnalysis && agentResults.length === 0 && !a2uiData
    && !hasConfirmations && !hasActions && !hasTasks;

  // 按状态分组 agent 结果
  const completedResults = useMemo(() => agentResults, [agentResults]);

  // 合同审查卡片可见性（由上传合同文件触发）
  const contractReviewVisible = store.contractReviewVisible;

  if (isEmpty && !isProcessing && !contractReviewVisible) {
    return <div className="h-full" />;
  }

  // 空闲但有合同审查卡片弹出
  if (isEmpty && !isProcessing && contractReviewVisible) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-4">
          <ContractReviewCard />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* ===== 1. 需求分析卡片 ===== */}
        <AnimatePresence>
          {requirementAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <RequirementCard analysis={requirementAnalysis} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 2. 需求确认交互卡片 ===== */}
        <AnimatePresence>
          {workspaceConfirmations.map((confirmation) => (
            <motion.div
              key={confirmation.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <WorkspaceConfirmationCard
                confirmation={confirmation}
                onConfirm={(selectedIds) => {
                  store.updateConfirmationSelection(confirmation.id, selectedIds);
                  store.confirmWorkspaceSelection(confirmation.id);
                  onWorkspaceConfirm?.(confirmation.id, selectedIds);
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ===== 2.5 补充输入区 — 让用户在工作台补充信息 ===== */}
        {(hasConfirmations || requirementAnalysis || hasTasks) && (
          <div className="relative">
            {!showSupplementInput ? (
              <button
                onClick={() => {
                  setShowSupplementInput(true);
                  setTimeout(() => supplementInputRef.current?.focus(), 100);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 bg-gray-50/80 hover:bg-blue-50 hover:text-blue-500 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>补充说明或提供更多信息...</span>
              </button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MessageSquarePlus className="w-3 h-3 text-blue-500" />
                      <span className="text-[11px] font-semibold text-blue-600">补充信息</span>
                    </div>
                    <textarea
                      ref={supplementInputRef}
                      value={supplementText}
                      onChange={(e) => setSupplementText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSupplementSend();
                        }
                        if (e.key === 'Escape') {
                          setShowSupplementInput(false);
                        }
                      }}
                      placeholder="补充需求说明，如预算范围、时间要求、特殊情况、案件详情等..."
                      rows={3}
                      className="w-full px-0 text-xs text-gray-700 bg-transparent resize-none focus:outline-none placeholder:text-gray-400"
                    />
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">
                        Enter 发送 · Shift+Enter 换行 · Esc 关闭
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowSupplementInput(false)}
                          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSupplementSend}
                          disabled={!supplementText.trim() || isProcessing}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            supplementText.trim() && !isProcessing
                              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          发送
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* ===== 3. Agent 协作看板（卡片式并列） ===== */}
        <AnimatePresence>
          {hasTasks && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AgentTaskBoard tasks={agentTasks} isProcessing={isProcessing} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 4. Agent 执行结果时间线 ===== */}
        {completedResults.length > 0 && (
          <div className="space-y-0">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-bold text-gray-600">执行结果</span>
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                {completedResults.length}
              </span>
            </div>
            {completedResults.map((result, index) => (
              <AgentCard
                key={result.id}
                result={result}
                index={index}
                isLast={index === completedResults.length - 1 && !isProcessing}
              />
            ))}
          </div>
        )}

        {/* ===== 5. 动作按钮区 ===== */}
        <AnimatePresence>
          {hasActions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <WorkspaceActionBar
                actions={workspaceActions}
                onAction={(actionId, payload) => {
                  onWorkspaceAction?.(actionId, payload);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 6. 正在处理指示（仅在无任务看板且无结果时显示） ===== */}
        <AnimatePresence>
          {isProcessing && !hasTasks && agentResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-4"
            >
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-600 font-medium">智能体正在处理中...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 6.5 思考链/推理过程展示（工作台内） ===== */}
        {thinkingSteps.length > 0 && (
          <div className="space-y-0">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Loader2 className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-purple-500' : 'text-gray-400'}`} />
              <span className="text-xs font-bold text-gray-600">推理过程</span>
              <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">
                {thinkingSteps.length} 步
              </span>
            </div>
            <div className="ml-2 pl-3 border-l-2 border-dashed border-gray-200 space-y-2">
              {thinkingSteps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="text-xs"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-gray-700">{step.agent || '分析'}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      step.phase === 'planning' ? 'bg-blue-50 text-blue-600' :
                      step.phase === 'requirement' ? 'bg-amber-50 text-amber-600' :
                      step.phase === 'result' ? 'bg-green-50 text-green-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      {step.phase === 'planning' ? 'DAG规划' :
                       step.phase === 'requirement' ? '需求分析' :
                       step.phase === 'result' ? '完成' : '推理'}
                    </span>
                  </div>
                  <p className="text-gray-500 leading-relaxed line-clamp-3">{step.content}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 7. 处理中指示（有内容但仍在处理时，底部显示小型指示） ===== */}
        {isProcessing && (hasTasks || agentResults.length > 0 || thinkingSteps.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 py-2 px-1"
          >
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            <span className="text-[11px] text-blue-500 font-medium">继续处理中...</span>
          </motion.div>
        )}

        {/* ===== 8. A2UI 动态组件区域 ===== */}
        {a2uiData && (
          <div className="mt-2 pt-3 border-t border-gray-100">
            <A2UIRenderer data={a2uiData} />
          </div>
        )}

        {/* ===== 9. 合同审查卡片（仅上传合同时弹出） ===== */}
        <AnimatePresence>
          {contractReviewVisible && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mt-3 pt-3 border-t border-gray-100"
            >
              <ContractReviewCard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
