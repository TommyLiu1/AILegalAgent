/**
 * 智能对话页面 (v3 — A2UI 集成版)
 * 
 * 改造点：
 * 1. 流式消息渲染 — token-by-token + Markdown
 * 2. 思考链/推理过程展示
 * 3. 右侧 RightPanel（工作台/Canvas/分析）替代旧 ContextPane
 * 4. 需求分析引导 + 引导式问答
 * 5. Agent 中间结果实时推送到右侧工作台
 * 6. Canvas 双向编辑
 * 7. A2UI 组件渲染 — Agent 返回结构化 UI 组件嵌入对话流
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import {
  FileText, X, Send, Paperclip, Bot, User, Sparkles, CheckCircle, Loader2,
  Lock, ShieldCheck, Cloud, HelpCircle, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Plus, MessageSquare, Trash2, Pencil, MoreHorizontal, ThumbsUp, ThumbsDown,
  CheckSquare, Square, XCircle, ArrowDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatApi } from '@/lib/api';
import { useChatStore, ConversationItem } from '@/lib/store';
import type { AgentResult, ThinkingStep, CanvasContent } from '@/lib/store';
import { usePrivacy, PrivacyMode } from '@/context/PrivacyContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { RightPanel } from '@/components/chat/RightPanel';
import { StreamingMessage } from '@/components/chat/StreamingMessage';
import { ThinkingChain } from '@/components/chat/ThinkingChain';
import { QuickActionsBar, DeepThinkToggle, type QuickActionMode } from '@/components/chat/QuickActionsBar';
import { SlashCommandPalette, useSlashCommand, type SlashCommand } from '@/components/chat/SlashCommandPalette';
import { ThinkingIndicator, type ThinkingStatus } from '@/components/chat/ThinkingIndicator';
import { A2UIRenderer, StreamingA2UIRenderer, useStreamingA2UI } from '@/components/a2ui';
import { MobileA2UIAdapter } from '@/components/a2ui/MobileA2UIAdapter';
import type { A2UIMessage, A2UIEvent, A2UIStreamEvent, A2UIComponent } from '@/components/a2ui';

// ========== 类型定义 ==========

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system' | 'clarification' | 'a2ui';
  content: string;
  timestamp: Date;
  agent?: string;
  memory_id?: string;
  feedback?: 'up' | 'down';
  attachment?: { type: 'file' | 'image'; name: string; size: string };
  metadata?: {
    isError?: boolean;
    originalError?: string;
    lastUserMessage?: string;
    canRetry?: boolean;
    errorAction?: string;
    isNotice?: boolean;
    level?: string;
  };
  clarification?: {
    questions: { question: string; options: string[] }[];
    original_content: string;
  };
  /** A2UI 结构化组件数据（嵌入对话流中的可交互 UI） */
  a2ui?: A2UIMessage;
}

const WELCOME_MESSAGE: Message = {
  id: '1',
  type: 'ai',
  content: '您好！我是您的 **AI 法务助手**，可以帮您处理合同审查、文书起草、律师委托、风险评估等各类法律事务。\n\n有什么可以帮您的？直接输入问题，或使用下方快捷操作开始。',
  timestamp: new Date(),
  agent: 'AI 法务助手',
};

// ========== 主组件 ==========

export default function Chat() {
  const store = useChatStore();
  const { mode } = usePrivacy();

  // 本地状态
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatWidth, setChatWidth] = useState(100); // 默认全宽
  const [isMobile, setIsMobile] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  // 右侧面板默认收起，只在有任务触发时展开
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // 内联 Agent 思考状态指示器
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus | null>(null);
  // 模式切换 + 斜杠命令
  const [quickActionMode, setQuickActionMode] = useState<QuickActionMode>('chat');
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [slashPaletteOpen, setSlashPaletteOpen] = useState(false);
  // 流式 A2UI 状态管理（StreamObject 协议 — 骨架屏 + 渐进渲染）
  const { streams: streamingA2UIMap, activeStreams, handleStreamEvent: handleA2UIStreamEvent } = useStreamingA2UI();
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 侧边栏
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // 批量选择模式
  const [batchMode, setBatchMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // 智能滚动：用户主动向上滚动时暂停自动滚动
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const clarificationRef = useRef<{ original_content: string } | null>(null);

  const {
    conversationId, setConversationId,
    conversations, setConversations, addConversation, removeConversation, removeConversations, updateConversationTitle,
    sidebarOpen: chatSidebarOpen, setChatSidebarOpen,
  } = store;

  // ========== 初始化 ==========

  useEffect(() => {
    if (!conversationId) setConversationId(uuidv4());
  }, [conversationId, setConversationId]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ========== 对话管理 ==========

  const loadConversations = useCallback(async () => {
    try {
      const result = await chatApi.listConversations(50);
      if (result?.conversations) setConversations(result.conversations);
    } catch (e) { console.debug('加载对话列表失败:', e); }
  }, [setConversations]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const closeCurrentWs = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close(1000, 'switching conversation');
      wsRef.current = null;
    }
  }, []);

  const handleNewConversation = useCallback(() => {
    closeCurrentWs();
    const newId = uuidv4();
    setConversationId(newId);
    setMessages([{ ...WELCOME_MESSAGE, id: uuidv4() }]);
    setHistoryLoaded(true); // 新对话无需加载历史
    setIsLoadingHistory(false);
    setIsProcessing(false);
    setInput('');
    setPendingFile(null);
    store.resetWorkspace();
    setTimeout(() => chatInputRef.current?.focus(), 100);
    toast.success('已创建新对话');
  }, [closeCurrentWs, setConversationId, store]);

  const handleSwitchConversation = useCallback((conv: ConversationItem) => {
    if (conv.id === conversationId) return;
    closeCurrentWs();
    setConversationId(conv.id);
    setMessages([WELCOME_MESSAGE]);
    setHistoryLoaded(false); // 触发重新加载历史
    setIsLoadingHistory(false);
    setIsProcessing(false);
    store.resetWorkspace();
  }, [conversationId, closeCurrentWs, setConversationId, store]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteConversation = useCallback(async (convId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMenuOpenId(null);
    setDeleteConfirmId(convId); // 弹出确认框
  }, []);

  const confirmDeleteConversation = useCallback(async () => {
    if (!deleteConfirmId) return;
    const convId = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await chatApi.deleteConversation(convId);
      removeConversation(convId);
      toast.success('对话已删除');
      if (convId === conversationId) handleNewConversation();
    } catch { toast.error('删除失败'); }
  }, [deleteConfirmId, conversationId, removeConversation, handleNewConversation]);

  const handleStartRename = useCallback((conv: ConversationItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMenuOpenId(null);
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, []);

  const handleFinishRename = useCallback(async () => {
    if (!editingConvId) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) { setEditingConvId(null); return; }
    try {
      await chatApi.updateConversationTitle(editingConvId, trimmed);
      updateConversationTitle(editingConvId, trimmed);
    } catch { toast.error('重命名失败'); }
    setEditingConvId(null);
  }, [editingConvId, editingTitle, updateConversationTitle]);

  // ========== 批量操作 ==========

  const handleToggleBatchMode = useCallback(() => {
    setBatchMode(prev => {
      if (prev) setSelectedConvIds(new Set()); // 退出批量模式时清空选择
      return !prev;
    });
  }, []);

  const handleToggleSelect = useCallback((convId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedConvIds(prev => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedConvIds.size === conversations.length) {
      setSelectedConvIds(new Set());
    } else {
      setSelectedConvIds(new Set(conversations.map(c => c.id)));
    }
  }, [conversations, selectedConvIds.size]);

  const handleBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedConvIds);
    if (ids.length === 0) return;
    setIsBatchDeleting(true);
    try {
      await chatApi.batchDeleteConversations(ids);
      removeConversations(ids);
      toast.success(`已删除 ${ids.length} 个对话`);
      if (conversationId && ids.includes(conversationId)) {
        handleNewConversation();
      }
      setSelectedConvIds(new Set());
      setBatchMode(false);
    } catch {
      toast.error('批量删除失败');
    } finally {
      setIsBatchDeleting(false);
    }
  }, [selectedConvIds, conversationId, removeConversations, handleNewConversation]);

  useEffect(() => {
    if (!menuOpenId) return;
    const handler = () => setMenuOpenId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpenId]);

  // ========== 加载对话历史 ==========

  useEffect(() => {
    if (!conversationId || historyLoaded) return;
    let cancelled = false;
    (async () => {
      setIsLoadingHistory(true);
      try {
        const result = await chatApi.getHistory({ conversation_id: conversationId, limit: 100 });
        if (cancelled) return;
        if (result?.messages?.length > 0) {
          const hist: Message[] = result.messages.map((m: any) => {
            // 从消息内容中还原附件信息
            const attachMatch = m.content?.match(/^\[附件:\s*(.+?)\]\n?/);
            const attachment = attachMatch ? {
              type: /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachMatch[1]) ? 'image' : 'file' as const,
              name: attachMatch[1].trim(),
              size: '',
            } : undefined;
            const displayContent = attachMatch ? m.content.replace(attachMatch[0], '').trim() : m.content;
            return {
              id: m.id || uuidv4(), type: m.role === 'user' ? 'user' : 'ai',
              content: displayContent || m.content,
              timestamp: new Date(m.created_at || Date.now()), agent: m.agent_name,
              attachment,
            };
          });
          setMessages(prev => {
            const welcome = prev.length > 0 && prev[0].id === '1' ? [prev[0]] : [];
            return [...welcome, ...hist];
          });
        }
      } catch (e) {
        if (!cancelled) console.debug('加载对话历史失败:', e);
      }

      // 同时恢复 Canvas 文档
      try {
        const canvasResult = await chatApi.getConversationCanvas(conversationId);
        if (!cancelled && canvasResult) {
          const canvasData = (canvasResult as any)?.data || canvasResult;
          if (canvasData?.content) {
            store.setCanvasContent({
              title: canvasData.title || '文档',
              content: canvasData.content,
              type: (canvasData.type === 'contract' ? 'contract' : 'document') as any,
              suggestions: [],
            });
          }
        }
      } catch (e) {
        // Canvas 恢复失败不影响主流程
        console.debug('Canvas 文档恢复失败:', e);
      }

      if (!cancelled) {
        setHistoryLoaded(true);
        setIsLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, historyLoaded]);

  // ========== 智能滚动控制 ==========
  // 检测用户是否主动向上滚动
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // 距底部 150px 以内认为用户没有向上滚动
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setUserScrolledUp(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 滚动到底部（仅在用户未主动向上滚动时）
  const scrollToBottom = useCallback((force = false) => {
    if (!force && userScrolledUp) return; // 尊重用户的滚动意图
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userScrolledUp]);

  // 防抖滚动 — 流式内容更新时最多 200ms 触发一次
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedScrollToBottom = useCallback(() => {
    if (userScrolledUp) return;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  }, [userScrolledUp]);

  // 新消息到达时智能滚动
  useEffect(() => {
    if (store.streamingContent) {
      debouncedScrollToBottom(); // 流式内容：防抖滚动
    } else {
      scrollToBottom(); // 新消息完成：立即滚动（除非用户主动向上滚了）
    }
  }, [messages, store.streamingContent, scrollToBottom, debouncedScrollToBottom]);

  // 使用 ref 保存 loadConversations，在 WS handler 中调用不会引起依赖循环
  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => { loadConversationsRef.current = loadConversations; }, [loadConversations]);

  // ========== 右侧面板展开控制 ==========
  const openRightPanel = useCallback((tab?: 'smart' | 'document') => {
    setRightPanelOpen(true);
    setChatWidth(50);
    if (tab) store.setRightPanelTab(tab);
    // 先展开，再调整尺寸到50%
    const panel = rightPanelRef.current;
    if (panel) {
      panel.expand();
      // expand 后立即 resize 到目标尺寸
      requestAnimationFrame(() => {
        panel.resize(50);
      });
    }
  }, [store]);

  const closeRightPanel = useCallback(() => {
    setRightPanelOpen(false);
    setChatWidth(100);
    // 折叠可调节面板
    rightPanelRef.current?.collapse();
  }, []);

  const toggleRightPanel = useCallback(() => {
    if (rightPanelOpen) {
      closeRightPanel();
    } else {
      openRightPanel();
    }
  }, [rightPanelOpen, openRightPanel, closeRightPanel]);

  // ========== 移动端切换时自动折叠右侧面板 ==========
  useEffect(() => {
    if (isMobile && rightPanelRef.current) {
      rightPanelRef.current.collapse();
    }
  }, [isMobile]);

  // ========== WebSocket 消息处理（v2 — 流式 + 思考链 + Agent 结果）==========

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      // --- 思考 / Agent 状态 → 同步到思考链 ---
      case 'agent_thinking':
      case 'agent_start':
        setIsProcessing(true);
        // 更新内联思考指示器（不打开面板）
        setThinkingStatus({
          agent: data.agent || '系统',
          message: data.message || data.content || '正在分析...',
        });
        if (data.agent || data.message) {
          store.addThinkingStep({
            id: uuidv4(),
            agent: data.agent || '系统',
            content: data.message || data.content || '正在分析...',
            phase: data.type === 'agent_start' ? 'planning' : 'execution',
            timestamp: Date.now(),
          });
        }
        break;

      case 'agent_working':
        setIsProcessing(true);
        setThinkingStatus({
          agent: data.agent || '',
          message: data.message || '正在执行任务...',
        });
        if (data.agent || data.message) {
          store.addThinkingStep({
            id: uuidv4(),
            agent: data.agent || '',
            content: data.message || '正在执行任务...',
            phase: 'execution',
            timestamp: Date.now(),
          });
        }
        break;

      case 'agent_complete':
        // 进度更新
        if (data.agent) {
          store.addThinkingStep({
            id: uuidv4(),
            agent: data.agent || '',
            content: data.message || '任务完成',
            phase: 'result',
            timestamp: Date.now(),
          });
        }
        break;

      // --- 思考链内容 ---
      case 'thinking_content':
        store.addThinkingStep({
          id: uuidv4(),
          agent: data.agent || '',
          content: data.content || '',
          phase: data.phase || 'execution',
          planSteps: data.plan_steps,
          timestamp: Date.now(),
        });
        break;

      // --- 需求分析结果 ---
      case 'requirement_analysis':
        store.setRequirementAnalysis(data);
        // 不再自动打开面板 — 由后端 panel_trigger 事件决定
        // 如果有引导问题，自动在右侧工作台生成确认卡片
        if (data.guidance_questions && data.guidance_questions.length > 0) {
          data.guidance_questions.forEach((q: any, idx: number) => {
            if (q.options && q.options.length > 0) {
              store.addWorkspaceConfirmation({
                id: `req-confirm-${uuidv4()}`,
                title: q.question || `确认事项 ${idx + 1}`,
                description: q.purpose,
                type: q.options.length > 3 ? 'multi' : 'single',
                options: q.options.map((opt: string, i: number) => ({
                  id: `opt-${i}`,
                  label: opt,
                })),
                selectedIds: [],
                status: 'pending',
                source: '需求分析Agent',
                callbackAction: 'requirement_clarification',
                createdAt: Date.now(),
              });
            }
          });
        }
        // 如果需求完整，推送建议动作
        if (data.is_complete && data.suggested_agents && data.suggested_agents.length > 0) {
          store.addWorkspaceAction({
            id: `action-start-${uuidv4()}`,
            label: '开始处理',
            description: `将由 ${data.suggested_agents.join('、')} 协同处理`,
            icon: 'quick',
            variant: 'primary',
            action: 'start_processing',
            payload: { suggested_agents: data.suggested_agents },
          });
        }
        break;

      // --- Agent 中间结果 → 右侧工作台 ---
      case 'agent_result': {
        const resultContent = data.content || '';
        if (!resultContent.trim()) break; // 跳过空结果
        store.addAgentResult({
          id: uuidv4(),
          agent: data.agent || '',
          agentKey: data.agent_key,
          content: resultContent,
          step: data.step || 0,
          totalSteps: data.total_steps || 0,
          elapsed: data.elapsed,
          timestamp: Date.now(),
        });
        break;
      }

      // --- Agent 任务看板（多 Agent 并列协作） ---
      case 'agent_task_start':
        store.addAgentTask({
          id: data.task_id || uuidv4(),
          agent: data.agent || '',
          agentKey: data.agent_key,
          description: data.description || '',
          status: 'running',
          progress: 0,
          startedAt: Date.now(),
        });
        // 不再自动打开面板 — 由后端 panel_trigger 事件决定
        break;

      case 'agent_task_progress':
        if (data.task_id) {
          store.updateAgentTask(data.task_id, {
            progress: data.progress || 0,
            elapsed: data.elapsed,
          });
        }
        break;

      case 'agent_task_complete':
        if (data.task_id) {
          store.updateAgentTask(data.task_id, {
            status: 'completed',
            progress: 100,
            result: data.result || '',
            elapsed: data.elapsed,
            completedAt: Date.now(),
          });
        }
        break;

      case 'agent_task_failed':
        if (data.task_id) {
          store.updateAgentTask(data.task_id, {
            status: 'failed',
            result: data.error || '处理失败',
          });
        }
        break;

      // --- Agent 生命周期事件（重试/替换/降级/强制完成） ---
      case 'agent_task_retry':
        setThinkingStatus({
          agent: data.agent || '系统',
          message: `正在重试 (${data.attempt}/${data.max_retries})...`,
        });
        break;

      case 'agent_replaced':
        setThinkingStatus({
          agent: data.replacement_agent || '系统',
          message: `接管 ${data.failed_agent} 的任务...`,
        });
        break;

      case 'task_degraded':
        // 降级输出通知
        if (data.task_id) {
          store.updateAgentTask(data.task_id, {
            status: 'failed',
            result: data.message || '降级输出',
          });
        }
        break;

      case 'task_force_complete':
        setIsProcessing(false);
        setThinkingStatus(null);
        toast.warning?.('任务超时，已返回部分结果') ?? toast.error('任务超时');
        break;

      case 'agent_tasks_batch':
        // 一次性推送多个 Agent 并列任务（含依赖关系，用于 DAG 层级分组展示）
        if (data.tasks && Array.isArray(data.tasks)) {
          store.setAgentTasks(data.tasks.map((t: any) => ({
            id: t.task_id || uuidv4(),
            agent: t.agent || '',
            agentKey: t.agent_key,
            description: t.description || '',
            status: t.status || 'queued',
            progress: t.progress || 0,
            startedAt: t.status === 'running' ? Date.now() : undefined,
            dependencies: t.dependencies || [],
          })));
          // 不再自动打开面板 — 由后端 panel_trigger 事件决定
        }
        break;

      // --- 工作台需求确认（从左侧触发右侧展示） ---
      case 'workspace_confirmation':
        store.addWorkspaceConfirmation({
          id: data.confirmation_id || uuidv4(),
          title: data.title || '请确认',
          description: data.description,
          type: data.selection_type || 'single',
          options: data.options || [],
          selectedIds: [],
          status: 'pending',
          source: data.source || data.agent,
          callbackAction: data.callback_action,
          createdAt: Date.now(),
        });
        // workspace_confirmation 仍打开面板 — 用户需要交互
        openRightPanel('smart');
        break;

      // --- 工作台动作按钮推送 ---
      case 'workspace_actions':
        if (data.actions && Array.isArray(data.actions)) {
          data.actions.forEach((a: any) => {
            store.addWorkspaceAction({
              id: a.id || uuidv4(),
              label: a.label || '',
              description: a.description,
              icon: a.icon,
              variant: a.variant || 'secondary',
              action: a.action || '',
              payload: a.payload,
              disabled: a.disabled,
            });
          });
          // 不再自动打开面板 — 由后端 panel_trigger 事件决定
        }
        break;

      // --- 流式 token ---
      case 'content_token': {
        const token = data.token || '';
        if (!token) break; // 跳过空 token，减少不必要的重渲染
        if (!store.streamingMessageId) {
          const newId = uuidv4();
          store.startStream(newId, data.agent || '');
        }
        store.appendStreamToken(token);
        break;
      }

      // --- A2UI 上下文更新 ---
      case 'context_update':
        if (data.context_type === 'a2ui') {
          if (data.data?.a2ui?.components) {
            store.appendA2uiComponents(data.data.a2ui.components);
          } else {
            store.setA2uiData(data.data);
          }
          if (isMobile) setShowContextPanel(true);
        }
        break;

      // --- A2UI 消息（直接嵌入对话流的结构化 UI） ---
      case 'a2ui_message': {
        const a2uiMsg: Message = {
          id: uuidv4(),
          type: 'a2ui',
          content: data.text || '',
          timestamp: new Date(),
          agent: data.agent || 'AI 助手',
          a2ui: {
            id: data.a2ui_id || uuidv4(),
            components: data.components || [],
            metadata: data.metadata,
          },
        };
        setMessages(prev => [...prev, a2uiMsg]);
        break;
      }

      // --- 流式 A2UI（StreamObject 协议 — 使用 useStreamingA2UI Hook） ---
      case 'a2ui_stream': {
        const streamEvt = data as A2UIStreamEvent;
        // 委托给 useStreamingA2UI Hook 管理流式状态（含骨架屏、增量更新）
        handleA2UIStreamEvent(streamEvt);

        // stream_component / stream_delta / stream_end 时同步到消息列表以持久化
        if (
          streamEvt.action === 'stream_component' ||
          streamEvt.action === 'stream_delta' ||
          streamEvt.action === 'stream_end'
        ) {
          const sid = streamEvt.streamId;
          // 从 Hook 的 streams Map 中获取最新状态（下一个渲染周期会更新）
          requestAnimationFrame(() => {
            const streamState = streamingA2UIMap.get(sid);
            if (streamState) {
              setMessages(prev => {
                const existing = prev.find(m => m.id === sid);
                if (existing) {
                  return prev.map(m => m.id === sid ? {
                    ...m,
                    a2ui: {
                      id: sid,
                      components: [...streamState.components],
                      // stream_end 时标记为完成，方便后续折叠/归档
                      completed: streamEvt.action === 'stream_end' ? true : (m.a2ui as any)?.completed,
                    },
                  } : m);
                }
                return [...prev, {
                  id: sid,
                  type: 'a2ui' as const,
                  content: '',
                  timestamp: new Date(),
                  agent: streamState.agent || 'AI 助手',
                  a2ui: {
                    id: sid,
                    components: [...streamState.components],
                    completed: streamEvt.action === 'stream_end',
                  },
                }];
              });
            }
          });
        }
        break;
      }

      // --- 后端主动触发面板 ---
      case 'panel_trigger':
        if (data.tab) {
          if (isMobile) {
            // 移动端：打开底部抽屉
            store.setRightPanelTab(data.tab as 'smart' | 'document');
            setShowContextPanel(true);
          } else {
            openRightPanel(data.tab as 'smart' | 'document');
          }
        }
        break;

      // --- Canvas 打开 ---
      case 'canvas_open': {
        const canvasContent = data.content || '';
        if (!canvasContent.trim()) {
          console.warn('[WS] canvas_open 收到空内容，跳过');
          break;
        }
        store.setCanvasContent({
          type: data.type || 'document',
          title: data.title || '文档',
          content: canvasContent,
          language: data.language,
        });
        openRightPanel('document');
        break;
      }

      // --- Canvas AI 更新 ---
      case 'canvas_update':
        if (store.canvasContent) {
          store.setCanvasContent({
            ...store.canvasContent,
            content: data.content || store.canvasContent.content,
            title: data.title || store.canvasContent.title,
          });
          toast.success('AI 优化完成');
          setIsProcessing(false);
        }
        openRightPanel('document');
        break;

      // --- Tab 切换建议 ---
      case 'tab_switch':
        if (data.tab) {
          // 将旧 Tab 名映射到新面板
          const tabMap: Record<string, string> = {
            workspace: 'smart', canvas: 'document', analysis: 'smart',
            lawyer: 'document', signing: 'document',
          };
          const mappedTab = tabMap[data.tab] || data.tab;
          if (mappedTab === 'smart' || mappedTab === 'document') {
            openRightPanel(mappedTab as 'smart' | 'document');
          }
          // 如果后端建议律师/签约，打开浮层
          if (data.tab === 'lawyer') store.setDocumentOverlay('lawyer');
          if (data.tab === 'signing') store.setDocumentOverlay('signing');
        }
        break;

      // --- 律师协助消息 ---
      case 'lawyer_comment':
        if (data.comment) {
          store.addLawyerComment(data.comment);
        }
        break;

      case 'lawyer_request_update':
        if (data.request) {
          store.setActiveAssistRequest(data.request);
        }
        break;

      // --- 律师在线状态更新 ---
      case 'lawyer_status':
        if (data.lawyers) {
          store.setOnlineLawyers(data.lawyers);
        }
        break;

      // --- 签约/盖章工作流更新 ---
      case 'signing_update':
        if (data.workflow_id && data.updates) {
          store.updateSigningWorkflow(data.workflow_id, data.updates);
        }
        break;

      // --- 文档就绪 → 自动打开文档面板 + 推送操作按钮 ---
      case 'document_ready':
        // 无论是否签约，都打开文档面板并通知用户
        openRightPanel('document');
        if (data.suggest_signing) {
          store.setDocumentOverlay('signing');
          toast.success('文档已就绪，可发起签约/盖章流程');
        } else {
          toast.success(data.title ? `「${data.title}」已生成，可在右侧文档面板查看和编辑` : '文档已生成，可在右侧面板查看');
        }
        // 同时在工作台推送相关动作
        store.addWorkspaceAction({
          id: `action-doc-${uuidv4()}`,
          label: '查看文档',
          description: data.title || '文档已生成',
          icon: 'document',
          variant: 'secondary',
          action: 'open_document',
        });
        if (data.suggest_signing) {
          store.addWorkspaceAction({
            id: `action-sign-${uuidv4()}`,
            label: '发起签约/盖章',
            description: '文档已就绪，可启动签约流程',
            icon: 'stamp',
            variant: 'success',
            action: 'initiate_signing',
          });
        }
        if (data.suggest_lawyer) {
          store.addWorkspaceAction({
            id: `action-lawyer-${uuidv4()}`,
            label: '转交律师审核',
            description: '建议由律师审阅后再签约',
            icon: 'approve',
            variant: 'warning',
            action: 'forward_lawyer',
          });
        }
        break;

      // --- 最终完成 (替代旧的 agent_response) ---
      case 'done':
      case 'agent_response': {
        setIsProcessing(false);
        setThinkingStatus(null);

        // 错误完成事件：仅重置状态，不添加消息（error 事件已处理展示）
        if (data.error) {
          store.finalizeStream();
          break;
        }

        // A2UI 响应已通过 a2ui_message 事件插入对话流，不需要重复添加
        if (data.a2ui) {
          loadConversationsRef.current();
          break;
        }

        // 如果有流式内容，先 finalize
        if (store.streamingMessageId) {
          const finalContent = data.content || store.streamingContent;
          const streamAgent = store.streamingAgent || data.agent || '';
          store.finalizeStream();
          
          const aiMessage: Message = {
            id: uuidv4(), type: 'ai', content: finalContent,
            timestamp: new Date(), agent: streamAgent,
            memory_id: data.memory_id,
          };
          setMessages(prev => [...prev, aiMessage]);
        } else if (data.content) {
          // 非流式模式（多 Agent 汇总结果）
          const aiMessage: Message = {
            id: uuidv4(), type: 'ai', content: data.content,
            timestamp: new Date(), agent: data.agent,
            memory_id: data.memory_id,
          };
          setMessages(prev => [...prev, aiMessage]);
        }
        // 对话完成后刷新对话列表（更新消息数、标题等）
        loadConversationsRef.current();
        break;
      }

      // --- 引导式问答 ---
      case 'clarification_request':
        setIsProcessing(false);
        const clarMsg: Message = {
          id: uuidv4(), type: 'clarification',
          content: data.message || '为了更好地帮助您，请补充以下信息：',
          timestamp: new Date(), agent: '需求分析',
          clarification: {
            questions: data.questions || [],
            original_content: data.original_content || '',
          },
        };
        setMessages(prev => [...prev, clarMsg]);
        clarificationRef.current = { original_content: data.original_content || '' };
        break;

      // --- 后端通知对话标题已更新 ---
      case 'conversation_title_updated':
        if (data.conversation_id && data.title) {
          store.updateConversationTitle(data.conversation_id, data.title);
        }
        break;

      // --- 消息保存失败警告 ---
      case 'save_warning':
        toast.warning?.(data.message || '消息保存异常') ?? toast.error(data.message || '消息保存异常');
        break;

      // --- 系统通知（如 API Key 无效提示） ---
      case 'system_notice': {
        const noticeLevel = data.level || 'info';
        const noticeMsg = data.content || data.message || '系统通知';
        if (noticeLevel === 'warning') {
          toast.warning?.(noticeMsg) ?? toast.error(noticeMsg);
        } else if (noticeLevel === 'error') {
          toast.error(noticeMsg);
        } else {
          toast.info?.(noticeMsg) ?? toast(noticeMsg);
        }
        // 同时作为系统消息插入聊天
        setMessages(prev => [...prev, {
          id: uuidv4(),
          type: 'system',
          content: noticeMsg,
          timestamp: new Date(),
          metadata: { isNotice: true, level: noticeLevel },
        }]);
        break;
      }

      // --- Canvas 保存结果 ---
      case 'canvas_saved':
        if (data.status === 'ok') {
          setCanvasSaved(true);
        } else {
          toast.error('Canvas 内容保存失败');
        }
        break;

      // --- 错误 ---
      case 'error': {
        setIsProcessing(false);
        setThinkingStatus(null);
        store.finalizeStream();
        // 后端已提供用户友好的错误消息
        const friendlyMsg = data.content || data.message || '处理过程中出现异常，请稍后重试。';
        const canRetry = data.can_retry !== false;
        const errorAction = data.action || 'retry';
        const lastUserMsg = data.original_content || '';
        
        // 在消息列表中显示可操作的错误提示
        setMessages(prev => [...prev, {
          id: uuidv4(),
          type: 'system' as const,
          content: friendlyMsg,
          timestamp: new Date(),
          metadata: {
            isError: true,
            originalError: data.detail || friendlyMsg,
            canRetry,
            errorAction,
            lastUserMessage: lastUserMsg,
          },
        }]);
        break;
      }

      default:
        // 未知事件类型，仅在开发环境下记录
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[WS] 未处理的事件类型: ${data.type}`, data);
        }
        break;
    }
  }, [isMobile, store]);

  // ========== WebSocket 连接（稳定引用，不因回调变化而重连）==========

  // 使用 ref 保存最新的 message handler，避免 WebSocket 因 callback 变化而断连重建
  const messageHandlerRef = useRef(handleWebSocketMessage);
  useEffect(() => {
    messageHandlerRef.current = handleWebSocketMessage;
  }, [handleWebSocketMessage]);

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 8; // 增加到 8 次重连尝试
  const intentionalCloseRef = useRef(false);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectWs = useCallback((convId: string) => {
    const ws = chatApi.connectWebSocket(
      convId,
      (data: any) => messageHandlerRef.current(data),
      // onError
      () => {
        setIsProcessing(false);
        store.finalizeStream();
      },
      // onClose
      (event) => {
        wsRef.current = null;
        // 停止心跳
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        // 如果是主动关闭（切换对话等），不重连
        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          return;
        }
        if (event.code !== 1000) {
          // 非正常关闭 → 自动重连
          setIsProcessing(false);
          store.finalizeStream();
          if (reconnectAttemptRef.current < maxReconnectAttempts) {
            // 指数退避 + 随机抖动，避免大量客户端同时重连
            const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            reconnectAttemptRef.current += 1;
            console.info(`WebSocket 断开 (code=${event.code})，${(delay / 1000).toFixed(1)}s 后第 ${reconnectAttemptRef.current} 次重连...`);
            reconnectTimerRef.current = setTimeout(() => {
              if (!wsRef.current) {
                const newWs = connectWs(convId);
                wsRef.current = newWs;
              }
            }, delay);
          } else {
            setMessages(prev => [
              ...prev,
              {
                id: uuidv4(),
                type: 'system' as const,
                content: '与服务器的连接已断开，多次重连失败。请检查网络或刷新页面重试。',
                timestamp: new Date(),
              },
            ]);
          }
        }
      },
    );
    // 连接成功后重置重连计数并启动心跳
    ws.addEventListener('open', () => {
      reconnectAttemptRef.current = 0;
      // 启动心跳：每 25 秒发一次 ping
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
          } catch {
            // 发送失败说明连接已断
          }
        }
      }, 25000);
    });
    return ws;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!conversationId || wsRef.current) return;
    const ws = connectWs(conversationId);
    wsRef.current = ws;
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      reconnectAttemptRef.current = 0;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'component cleanup');
      }
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ========== 发送消息超时保护 ==========

  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isProcessing) {
      // 180 秒超时：考虑到 LLM 重试和多 Agent 协作可能需要较长时间
      processingTimeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
        store.finalizeStream();
        const lastUserMsg = [...messages].reverse().find(m => m.type === 'user');
        setMessages(prev => [
          ...prev,
          {
            id: uuidv4(),
            type: 'system' as const,
            content: '请求处理超时，AI 服务可能较忙。您可以点击重试。',
            timestamp: new Date(),
            metadata: {
              isError: true,
              canRetry: true,
              lastUserMessage: lastUserMsg?.content || '',
            },
          },
        ]);
      }, 180_000);
    } else {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
    return () => {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // ========== 发送消息 ==========

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || input;
    if (!messageContent.trim() || isProcessing) return;

    // 确保 WebSocket 连接可用
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      if (conversationId) {
        wsRef.current = connectWs(conversationId);
        // 等待连接建立（最多 3 秒）
        let waitAttempts = 0;
        while (wsRef.current?.readyState !== WebSocket.OPEN && waitAttempts < 15) {
          await new Promise(resolve => setTimeout(resolve, 200));
          waitAttempts++;
        }
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          toast.error('无法连接到服务器，请检查网络后重试');
          return;
        }
      } else {
        toast.error('请先选择或创建一个对话');
        return;
      }
    }

    const attachedFile = pendingFile;
    const userMessage: Message = {
      id: uuidv4(), type: 'user', content: messageContent, timestamp: new Date(),
      attachment: attachedFile ? {
        type: attachedFile.type.includes('image') ? 'image' : 'file',
        name: attachedFile.name, size: `${(attachedFile.size / 1024).toFixed(1)} KB`,
      } : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setPendingFile(null);
    setActiveActionId(null); // 清除快捷操作选中态
    setIsProcessing(true);
    setUserScrolledUp(false); // 发送消息时重置滚动状态，自动跟随新内容
    store.resetWorkspace();

    // === 文件上传：先上传文件获取文档 ID 和提取文本，再通过 WebSocket 发送 ===
    let sendContent = messageContent;
    let uploadedDocId: string | undefined;
    let extractedText: string | undefined;

    if (attachedFile) {
      try {
        // 1. 上传文件到后端文档系统
        const { documentsApi } = await import('@/lib/api');
        const uploadResult = await documentsApi.upload(attachedFile, {
          doc_type: attachedFile.name.endsWith('.docx') || attachedFile.name.endsWith('.doc') ? 'contract' : 'other',
          description: `聊天附件：${messageContent.slice(0, 50)}`,
        });
        
        // 2. 提取文档信息
        const docData = (uploadResult as any)?.data;
        if (docData) {
          uploadedDocId = docData.id;
          extractedText = docData.extracted_text;
        }
        
        // 3. 构建包含文件内容的消息
        if (extractedText && extractedText.trim()) {
          sendContent = `[附件: ${attachedFile.name}]\n${messageContent}\n\n---\n以下是文件「${attachedFile.name}」的内容：\n${extractedText.slice(0, 15000)}`;
        } else {
          sendContent = `[附件: ${attachedFile.name}]\n${messageContent}`;
        }
      } catch (e: any) {
        console.warn('文件上传失败，将仅发送文件名：', e);
        toast.warning?.('文件上传失败，将仅发送文本消息') ?? toast.error('文件上传失败');
        sendContent = `[附件: ${attachedFile.name}]\n${messageContent}`;
      }
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        content: sendContent,
        privacy_mode: mode,
        has_attachments: !!attachedFile,
        document_id: uploadedDocId,
        mode: quickActionMode,  // 功能模式药丸 → 传递给后端 Coordinator
      }));
      if (conversationId && !conversations.find(c => c.id === conversationId)) {
        const title = messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : '');
        addConversation({
          id: conversationId, title, message_count: 1,
          last_message_at: new Date().toISOString(), created_at: new Date().toISOString(),
        });
      }
    } else {
      toast.error('连接断开，请刷新重试');
      setIsProcessing(false);
    }
  };

  // ========== 澄清回复 ==========

  const handleClarificationResponse = (originalContent: string, selections: Record<string, string>, supplement?: string) => {
    if (isProcessing) return;
    let selectionText = Object.entries(selections).map(([q, a]) => `${q}: ${a}`).join('；');
    if (supplement) {
      selectionText += `\n\n用户补充说明：${supplement}`;
    }
    // v3 优化：不再在对话流中重复输出选择内容，直接发送到后端
    setIsProcessing(true);
    store.resetWorkspace();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'clarification_response', content: selectionText,
        original_content: originalContent, selections: selectionText,
        supplement: supplement || '', privacy_mode: mode,
      }));
    }
  };

  // ========== 反馈 ==========

  const handleFeedback = async (message: Message, rating: number) => {
    if (!message.memory_id) return;
    try {
      await chatApi.submitMemoryFeedback(message.memory_id, rating);
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, feedback: rating >= 4 ? 'up' : 'down' } : m));
      toast.success('反馈已记录');
    } catch { toast.error('反馈提交失败'); }
  };

  // 斜杠命令检测
  const { isSlashMode } = useSlashCommand(input);

  // 输入变化时控制斜杠命令面板
  useEffect(() => {
    setSlashPaletteOpen(isSlashMode);
  }, [isSlashMode]);

  // 斜杠命令选择
  const handleSlashCommandSelect = useCallback((cmd: SlashCommand) => {
    setSlashPaletteOpen(false);
    if (cmd.query) {
      setInput('');
      handleSendMessage(cmd.query);
    }
  }, [handleSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // 斜杠命令模式下，Enter 由 SlashCommandPalette 处理
    if (slashPaletteOpen) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  // 动态 placeholder — 根据功能模式切换显示不同提示文本（千问/豆包风格）
  const dynamicPlaceholder = useMemo(() => {
    if (pendingFile) return `描述您对「${pendingFile.name}」的需求...`;
    if (quickActionMode === 'deep_analysis') return '描述您需要深度分析的法律问题（合同/文书/研究均可）...';
    return '发送消息或输入 / 选择技能';
  }, [pendingFile, quickActionMode]);

  // ========== Canvas 操作 ==========

  // Canvas 内容变更 → 防抖发送到后端 + 保存到文档系统
  const canvasSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canvasSaved, setCanvasSaved] = useState(true);

  const handleCanvasContentChange = useCallback((content: string) => {
    // 1. 立即更新本地状态
    store.updateCanvasText(content);
    setCanvasSaved(false);

    // 2. 防抖 1.5s 后发送到后端
    if (canvasSaveTimerRef.current) clearTimeout(canvasSaveTimerRef.current);
    canvasSaveTimerRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'canvas_edit',
          content,
          title: store.canvasContent?.title || '文档',
          canvas_type: store.canvasContent?.type || 'document',
        }));
        setCanvasSaved(true);
      }
    }, 1500);
  }, [store]);

  // Canvas 手动保存（将内容保存为文档）
  const handleCanvasSaveAsDocument = useCallback(async () => {
    if (!store.canvasContent?.content) return;
    try {
      await chatApi.sendMessage({
        content: `[系统] 保存文档: ${store.canvasContent.title}`,
        conversation_id: conversationId || undefined,
      });
      // 调用文档 API 保存
      const { documentsApi } = await import('@/lib/api');
      await documentsApi.createText({
        name: store.canvasContent.title || '未命名文档',
        content: store.canvasContent.content,
        doc_type: store.canvasContent.type === 'contract' ? 'contract' : 'document',
        description: `通过 Canvas 编辑器创建`,
      });
      toast.success('文档已保存到文档库');
      setCanvasSaved(true);
    } catch (e) {
      toast.error('保存失败，请稍后重试');
    }
  }, [store.canvasContent, conversationId]);

  const handleCanvasAIOptimize = useCallback(() => {
    if (!store.canvasContent || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: 'canvas_request',
      canvas_content: store.canvasContent.content,
      canvas_type: store.canvasContent.type,
    }));
    setIsProcessing(true);
  }, [store.canvasContent]);

  const handleCanvasSuggestionAction = useCallback((id: string, action: 'accept' | 'reject') => {
    if (!store.canvasContent) return;
    const updated = (store.canvasContent.suggestions || []).map(s =>
      s.id === id ? { ...s, status: action === 'accept' ? 'accepted' as const : 'rejected' as const } : s
    );
    store.setCanvasContent({ ...store.canvasContent, suggestions: updated });
  }, [store]);

  // ========== 转发律师 ==========
  const handleForwardToLawyer = useCallback(() => {
    openRightPanel('document');
    store.setDocumentOverlay('lawyer');
  }, [store, openRightPanel]);

  // ========== 发起签约/盖章 ==========
  const handleInitiateSigning = useCallback(() => {
    openRightPanel('document');
    store.setDocumentOverlay('signing');
  }, [store, openRightPanel]);

  // ========== 工作台确认回调 ==========
  const handleWorkspaceConfirm = useCallback((confirmationId: string, selectedIds: string[]) => {
    // 通过 WebSocket 将用户选择发送回后端
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'workspace_confirmation_response',
        confirmation_id: confirmationId,
        selected_ids: selectedIds,
        conversation_id: store.conversationId,
      }));
    }
  }, [store.conversationId]);

  // ========== 工作台动作回调 ==========
  const handleWorkspaceAction = useCallback((actionId: string, payload?: any) => {
    // 通过 WebSocket 将动作发送回后端
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'workspace_action',
        action_id: actionId,
        payload,
        conversation_id: store.conversationId,
      }));
    }
    // 某些动作可以直接在前端执行
    switch (actionId) {
      case 'open_document':
        openRightPanel('document');
        break;
      case 'forward_lawyer':
        handleForwardToLawyer();
        break;
      case 'initiate_signing':
        handleInitiateSigning();
        break;
    }
  }, [store.conversationId, handleForwardToLawyer, handleInitiateSigning]);

  // ========== 工作台补充输入 ==========
  const handleWorkspaceSupplementInput = useCallback((text: string) => {
    if (!text.trim() || isProcessing) return;
    // 将补充信息作为用户消息发送到对话流
    const userMsg: Message = {
      id: uuidv4(), type: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat', content: `[补充说明] ${text.trim()}`,
        conversation_id: store.conversationId, privacy_mode: mode,
      }));
    }
  }, [isProcessing, store.conversationId, mode]);

  // ========== 隐私提示 ==========

  const getPrivacyHint = () => {
    switch (mode) {
      case PrivacyMode.LOCAL: return { text: '绝密模式：数据仅在本地处理', icon: Lock, color: 'text-indigo-600' };
      case PrivacyMode.HYBRID: return { text: '安全混合：敏感数据已自动脱敏', icon: ShieldCheck, color: 'text-emerald-600' };
      case PrivacyMode.CLOUD: return { text: '云端增强：正在使用联网模型', icon: Cloud, color: 'text-primary' };
    }
  };
  const privacyHint = getPrivacyHint();
  const PrivacyIcon = privacyHint.icon;

  const formatConvDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ========== 渲染消息 ==========

  // ========== A2UI 事件处理（千问购物式：卡片操作 → 对话消息回传） ==========

  /**
   * 卡片操作→对话消息映射表
   * 
   * 千问购物模式的核心交互：用户点击卡片上的操作按钮后，
   * 自动在对话流中生成可见的用户消息，让整个流程像自然对话一样流畅。
   * 
   * 映射规则：
   * - 浏览类操作（查看详情、了解更多）→ 生成自然语言消息
   * - 确认类操作（确认委托、接受修改）→ 生成确认消息 + 发送 A2UI 事件
   * - 表单类操作（提交表单）→ 静默发送 A2UI 事件（不生成消息）
   */
  const A2UI_ACTION_TO_MESSAGE: Record<string, (payload: Record<string, any>) => string | null> = useMemo(() => ({
    // --- 律师相关 ---
    'contact_lawyer': (p) => `我想咨询${p.lawyerName || '这位'}律师`,
    'consult_lawyer': (p) => `请帮我联系${p.lawyerName || '这位'}律师进行咨询`,
    'view_lawyer_detail': (p) => `请详细介绍${p.lawyerName || '这位'}律师的擅长领域和成功案例`,
    'view_more_lawyers': () => '请推荐更多律师',
    'ai_match_lawyer': () => '请用 AI 帮我智能匹配最合适的律师',
    // --- 合同相关 ---
    'accept_changes': () => '我接受这些修改建议',
    'export_report': () => '请导出合同审查报告',
    'view_full_report': () => '请展示完整的合同审查报告',
    'ai_suggestions': () => '请给出 AI 修改建议',
    'start_review': () => '开始审查合同',
    // --- 费用/委托相关 ---
    'confirm_fee': () => '我确认这个费用方案',
    'confirm_engagement': () => '确认委托，请开始处理',
    // --- 风险/案件相关 ---
    'view_case_detail': (p) => `请展示案件${p.caseId ? ` ${p.caseId}` : ''}的详细信息`,
    'assess_contract_risk': () => '请评估合同风险',
    'assess_compliance': () => '请进行合规审查',
    'assess_litigation_risk': () => '请评估诉讼风险',
    'assess_ip_risk': () => '请评估知识产权风险',
    // --- 文书相关 ---
    'select_doc_type': (p) => `我需要起草${p.docType === 'contract' ? '合同/协议' : p.docType === 'lawyer_letter' ? '律师函' : p.docType === 'legal_opinion' ? '法律意见书' : '法律文书'}`,
    // --- 通用 ---
    'quick_intent': () => null, // 由 query payload 处理
    'go_back': () => null, // 导航操作，不生成消息
  }), []);

  const handleA2UIEvent = useCallback((event: A2UIEvent) => {
    console.log('[A2UI Event]', event);

    // 特殊处理：快捷意图按钮 → 直接作为用户消息发送
    if (event.actionId === 'quick_intent' && event.payload?.query) {
      handleSendMessage(event.payload.query);
      return;
    }

    // 千问购物模式：检查是否有对应的自然语言消息映射
    const messageGenerator = A2UI_ACTION_TO_MESSAGE[event.actionId];
    if (messageGenerator) {
      const naturalMessage = messageGenerator(event.payload || {});
      if (naturalMessage) {
        // 同时作为对话消息发送（让用户看到自己的操作）+ A2UI 事件（让后端正确处理）
        handleSendMessage(naturalMessage);
        return;
      }
    }

    // 无映射的操作：通过 A2UI 事件系统静默发送（表单提交等）
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'a2ui_event',
        action_id: event.actionId,
        component_id: event.componentId,
        payload: event.payload || {},
        form_data: event.formData || {},
      }));
    } else {
      // 降级：作为普通消息发送
      const fallbackContent = `[A2UI操作] ${event.actionId}${event.formData ? ' | 表单数据: ' + JSON.stringify(event.formData) : ''}`;
      handleSendMessage(fallbackContent);
    }
  }, [handleSendMessage, A2UI_ACTION_TO_MESSAGE]);

  // 找到最后一个 A2UI 类型消息的 ID（用于移动端历史折叠判断）
  const lastA2UIMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'a2ui' && messages[i].a2ui) {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  const renderMessage = (message: Message) => {
    // A2UI 消息 — 结构化 UI 组件
    if (message.type === 'a2ui' && message.a2ui) {
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="group"
        >
          {/* Agent 标签 */}
          {message.agent && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/50 mb-1.5 ml-0.5">
              <Bot className="h-3 w-3" />
              {message.agent}
            </div>
          )}

          {/* 文本内容（如果有） */}
          {message.content && (
            <div className="bg-card border border-border text-foreground px-4 py-3 rounded-2xl rounded-bl-md shadow-sm mb-2">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* A2UI 组件 — 移动端使用千问风格适配器（历史卡片自动折叠） */}
          <div className={cn('', isMobile ? 'w-full' : 'max-w-[95%]')}>
            {isMobile ? (
              <MobileA2UIAdapter
                message={message.a2ui}
                onEvent={handleA2UIEvent}
                isHistorical={message.id !== lastA2UIMessageId}
                showBottomBar={message.id === lastA2UIMessageId}
              />
            ) : (
              <A2UIRenderer
                message={message.a2ui}
                onEvent={handleA2UIEvent}
                animated={true}
              />
            )}
          </div>

          {/* 时间戳 */}
          <div className="flex items-center gap-2 mt-1.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="text-[10px] text-muted-foreground/40">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </motion.div>
      );
    }

    if (message.type === 'clarification') {
      return (
        <ClarificationBubble
          key={message.id}
          message={message.content}
          questions={message.clarification!.questions}
          originalContent={message.clarification!.original_content}
          onSubmit={handleClarificationResponse}
          disabled={isProcessing}
        />
      );
    }

    // 系统消息 — 居中提示条（错误消息带重试按钮）
    if (message.type === 'system') {
      const isErr = message.metadata?.isError;
      const canRetry = (message.metadata as any)?.canRetry !== false;
      const retryContent = (message.metadata as any)?.lastUserMessage
        || [...messages].reverse().find(m => m.type === 'user')?.content;
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <div className={`text-[11px] mx-auto font-medium px-4 py-1.5 rounded-full flex items-center gap-2 ${
            isErr
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-warning-light text-warning border border-warning/30'
          }`}>
            <span>{message.content}</span>
            {isErr && canRetry && retryContent && (
              <button
                onClick={() => {
                  handleSendMessage(retryContent);
                }}
                disabled={isProcessing}
                className="ml-1 px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-full text-[10px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                重试
              </button>
            )}
          </div>
        </motion.div>
      );
    }

    const isUser = message.type === 'user';

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        key={message.id}
        className={`group ${isUser ? 'flex justify-end' : ''}`}
      >
        <div className={`max-w-[85%] ${isUser ? '' : ''}`}>
          {/* AI 消息 — Agent 标签 */}
          {!isUser && message.agent && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/50 mb-1.5 ml-0.5">
              <Bot className="h-3 w-3" />
              {message.agent}
            </div>
          )}

          {/* 消息气泡 */}
          <div className={`rounded-2xl leading-relaxed text-sm ${
            isUser
              ? 'bg-primary text-white px-4 py-2.5 rounded-br-md'
              : 'bg-card border border-border text-foreground px-4 py-3 rounded-bl-md shadow-sm'
          }`}>
            {/* 附件 */}
            {message.attachment && (
              <div className={`flex items-center gap-2.5 mb-2.5 p-2 rounded-lg ${
                isUser ? 'bg-card/15' : 'bg-muted border border-border'
              }`}>
                <div className={`p-1.5 rounded ${isUser ? 'bg-card/20' : 'bg-card shadow-sm'}`}>
                  <FileText className={`w-4 h-4 ${isUser ? 'text-white' : 'text-primary'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">{message.attachment.name}</span>
                  {message.attachment.size && (
                    <span className={`text-[10px] ${isUser ? 'text-white/70' : 'text-muted-foreground/50'}`}>{message.attachment.size}</span>
                  )}
                </div>
              </div>
            )}

            {/* 消息内容 */}
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-ul:text-foreground/80 prose-ol:text-foreground/80 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-pre:bg-gray-900 prose-pre:text-gray-100">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* AI 消息内嵌的 A2UI 组件（文本 + 结构化 UI 混合展示） */}
          {!isUser && message.a2ui && (
            <div className="mt-2">
              {isMobile ? (
                <MobileA2UIAdapter
                  message={message.a2ui}
                  onEvent={handleA2UIEvent}
                  isHistorical={false}
                  showBottomBar={false}
                />
              ) : (
                <A2UIRenderer
                  message={message.a2ui}
                  onEvent={handleA2UIEvent}
                  animated={true}
                  isMobile={isMobile}
                />
              )}
            </div>
          )}

          {/* AI 消息底部操作栏 — 始终显示但淡入 */}
          {!isUser && (
            <div className="flex items-center gap-2 mt-1.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-[10px] text-muted-foreground/40">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.memory_id && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleFeedback(message, 5)}
                    disabled={!!message.feedback}
                    className={`p-1 rounded-md hover:bg-muted transition-colors ${
                      message.feedback === 'up' ? 'text-green-500' : 'text-muted-foreground/40 hover:text-green-500'
                    }`}
                    title="有帮助"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleFeedback(message, 1)}
                    disabled={!!message.feedback}
                    className={`p-1 rounded-md hover:bg-muted transition-colors ${
                      message.feedback === 'down' ? 'text-red-500' : 'text-muted-foreground/40 hover:text-red-500'
                    }`}
                    title="需改进"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ========== JSX ==========

  return (
    <div className="h-full flex bg-muted/50 relative">
      {/* ========== 左侧对话列表侧边栏 ========== */}
      <AnimatePresence>
        {chatSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full flex-shrink-0 bg-card flex flex-col overflow-hidden border-r border-border"
          >
            <div className="p-3 flex flex-col gap-2 border-b border-border">
              <div className="flex items-center justify-between">
                {!batchMode ? (
                  <>
                    <button onClick={handleNewConversation}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex-1 mr-2 shadow-sm">
                      <Plus className="w-4 h-4" /> 新建对话
                    </button>
                    <button onClick={handleToggleBatchMode}
                      className="p-2 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="批量管理">
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button onClick={() => setChatSidebarOpen(false)}
                      className="p-2 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="收起侧边栏">
                      <PanelLeftClose className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-foreground flex-1">
                      已选 {selectedConvIds.size} / {conversations.length}
                    </span>
                    <button onClick={handleToggleBatchMode}
                      className="p-2 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="取消">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {batchMode && (
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg border border-border transition-colors">
                    {selectedConvIds.size === conversations.length ? (
                      <><CheckSquare className="w-3.5 h-3.5" /> 取消全选</>
                    ) : (
                      <><Square className="w-3.5 h-3.5" /> 全选</>
                    )}
                  </button>
                  <button onClick={handleBatchDelete}
                    disabled={selectedConvIds.size === 0 || isBatchDeleting}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex-1 justify-center shadow-sm">
                    {isBatchDeleting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 删除中...</>
                    ) : (
                      <><Trash2 className="w-3.5 h-3.5" /> 删除所选 ({selectedConvIds.size})</>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground/50 text-sm mt-8 px-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-muted-foreground">暂无对话记录</p>
                  <p className="text-xs mt-1 text-muted-foreground/50">开始新对话后将在此处显示</p>
                </div>
              ) : conversations.map((conv) => {
                const isActive = conv.id === conversationId;
                const isEditing = editingConvId === conv.id;
                const isSelected = selectedConvIds.has(conv.id);
                return (
                  <div key={conv.id} onClick={() => batchMode ? handleToggleSelect(conv.id) : (!isEditing && handleSwitchConversation(conv))}
                    className={`group relative mx-2 mb-0.5 rounded-lg cursor-pointer transition-colors ${
                      batchMode && isSelected
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : isActive && !batchMode
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-foreground hover:bg-muted border border-transparent'
                    }`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {batchMode ? (
                        <div className="flex-shrink-0" onClick={(e) => handleToggleSelect(conv.id, e)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </div>
                      ) : (
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        {isEditing && !batchMode ? (
                          <input ref={editInputRef} value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={handleFinishRename} onKeyDown={(e) => { if (e.key === 'Enter') handleFinishRename(); if (e.key === 'Escape') setEditingConvId(null); }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-card text-foreground text-sm px-2 py-0.5 rounded border border-primary/40 focus:outline-none focus:border-primary" />
                        ) : (
                          <>
                            <p className={`text-sm truncate font-medium ${
                              batchMode && isSelected ? 'text-red-700' : isActive && !batchMode ? 'text-primary' : 'text-foreground'
                            }`}>{conv.title || '未命名对话'}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              {formatConvDate(conv.last_message_at || conv.created_at)}
                              {conv.message_count > 0 && ` · ${conv.message_count}条`}
                            </p>
                          </>
                        )}
                      </div>
                      {!isEditing && !batchMode && (
                        <div className={`flex items-center gap-0.5 ${isActive ? 'visible' : 'invisible group-hover:visible'}`}>
                          <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conv.id ? null : conv.id); }}
                            className="p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <AnimatePresence>
                      {!batchMode && menuOpenId === conv.id && (
                        <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }}
                          className="absolute right-2 top-full z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => handleStartRename(conv, e)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Pencil className="w-3 h-3" /> 重命名
                          </button>
                          <button onClick={(e) => handleDeleteConversation(conv.id, e)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3 h-3" /> 删除
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-border text-center">
              <p className="text-[10px] text-muted-foreground/50">共 {conversations.length} 个对话</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== 主内容区 ========== */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* 左侧聊天区 — 可调节宽度 */}
          <ResizablePanel defaultSize={100} minSize={30}>
          <div
            className="flex flex-col bg-card h-full"
          >
            {/* Header — v3 紧凑版 */}
            <div className="px-4 py-2 border-b border-border flex items-center gap-2.5 bg-card/80 backdrop-blur-sm">
              {!chatSidebarOpen && (
                <button onClick={() => setChatSidebarOpen(true)}
                  className="p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="展开对话列表">
                  <PanelLeftOpen className="w-4.5 h-4.5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground">AI 法务助手</span>
                <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-medium border border-green-100">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  在线
                </span>
              </div>
              <div className="flex-1" />
              <button onClick={handleNewConversation}
                className="p-1.5 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="新建对话">
                <Plus className="w-4.5 h-4.5" />
              </button>
              {/* 工作台/文档面板切换 */}
              {!isMobile && (
                <button
                  onClick={toggleRightPanel}
                  className={`p-1.5 rounded-lg transition-colors ${
                    rightPanelOpen
                      ? 'text-primary bg-primary/10 hover:bg-primary/20'
                      : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted'
                  }`}
                  title={rightPanelOpen ? '收起工作台' : '展开工作台'}
                >
                  {rightPanelOpen ? <PanelLeftClose className="w-4.5 h-4.5" /> : <PanelLeftOpen className="w-4.5 h-4.5" />}
                </button>
              )}
            </div>

            {/* ========== 消息区 + 输入区 垂直可调节 ========== */}
            <ResizablePanelGroup direction="vertical" className="flex-1">
            <ResizablePanel defaultSize={75} minSize={25}>
            {/* Messages — 移动端额外底部内边距防止 BottomActionBar 遮挡 */}
            <div ref={messagesContainerRef} className={`h-full overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth ${isMobile ? 'pb-20' : ''}`}>
              {isLoadingHistory && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">正在加载对话历史...</span>
                </div>
              )}
              {messages.map(renderMessage)}

              {/* 思考链（嵌入消息流中，作为 AI 回复的一部分） */}
              {store.thinkingSteps.length > 0 && (
                <ThinkingChain steps={store.thinkingSteps} isThinking={isProcessing} />
              )}

              {/* 流式消息 */}
              {store.streamingMessageId && (
                <StreamingMessage
                  content={store.streamingContent}
                  agent={store.streamingAgent}
                  isStreaming={true}
                />
              )}

              {/* 流式 A2UI 渲染器 — 骨架屏 + 渐进式卡片生长 */}
              {activeStreams.length > 0 && (
                <div className="space-y-3">
                  {activeStreams.map(stream => (
                    <StreamingA2UIRenderer
                      key={stream.streamId}
                      stream={stream}
                      onEvent={handleA2UIEvent}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              )}

              {/* 内联 Agent 思考指示器 — 替代打开面板 */}
              {isProcessing && !store.streamingMessageId && (
                <AnimatePresence>
                  {thinkingStatus ? (
                    <ThinkingIndicator status={thinkingStatus} />
                  ) : store.thinkingSteps.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">AI 正在思考...</span>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 回到底部悬浮按钮 — 用户向上滚动时显示 */}
            <AnimatePresence>
              {userScrolledUp && isProcessing && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => {
                    setUserScrolledUp(false);
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  回到最新
                </motion.button>
              )}
            </AnimatePresence>
            </ResizablePanel>

            {/* 垂直拖拽手柄 — 消息区与输入区之间 */}
            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={25} minSize={10} maxSize={50}>
            {/* Input Area — v3 豆包风格，flex 布局使 textarea 跟随面板高度自适应 */}
            <div className="px-3 py-3 bg-card border-t border-border h-full flex flex-col min-w-0">
              <div className="w-full min-w-0 flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
                <AnimatePresence>
                  {pendingFile && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2">
                      <div className="flex items-center gap-2.5 px-3 py-2 bg-primary/10/70 border border-primary/20 rounded-xl">
                        <div className="bg-card p-1 rounded shadow-sm"><FileText className="w-3.5 h-3.5 text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{pendingFile.name}</p>
                          <p className="text-[10px] text-muted-foreground/50">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={() => setPendingFile(null)} className="p-0.5 text-muted-foreground/50 hover:text-red-500 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 快捷操作标签栏 — 常驻输入框上方 */}
                <QuickActionsBar
                  onFillInput={(text) => {
                    setInput(text);
                    // 通过 query 文本反查 action id 来设置选中态 + 自动切换模式
                    const ACTION_MODE_MAP: Record<string, { id: string; query: string; mode: QuickActionMode }> = {
                      '我想咨询一个法律问题：': { id: 'qa-consult', query: '我想咨询一个法律问题：', mode: 'chat' },
                      '请帮我审查这份合同：':   { id: 'qa-contract', query: '请帮我审查这份合同：', mode: 'deep_analysis' },
                      '请帮我起草一份':         { id: 'qa-draft', query: '请帮我起草一份', mode: 'deep_analysis' },
                      '请帮我做风险评估：':     { id: 'qa-risk', query: '请帮我做风险评估：', mode: 'deep_analysis' },
                      '请帮我做尽职调查，目标公司：': { id: 'qa-dd', query: '请帮我做尽职调查，目标公司：', mode: 'deep_analysis' },
                      '我有一个劳动人事问题：': { id: 'qa-labor', query: '我有一个劳动人事问题：', mode: 'chat' },
                      '请帮我解读以下法规政策：': { id: 'qa-regulation', query: '请帮我解读以下法规政策：', mode: 'deep_analysis' },
                      '请帮我分析诉讼策略：':   { id: 'qa-litigation', query: '请帮我分析诉讼策略：', mode: 'deep_analysis' },
                    };
                    const matched = ACTION_MODE_MAP[text];
                    setActiveActionId(matched?.id || null);
                    // 自动切换到对应功能模式，让后端获取正确的 mode 上下文
                    if (matched?.mode) {
                      setQuickActionMode(matched.mode);
                    }
                    // 填充后自动聚焦输入框，光标移到末尾
                    setTimeout(() => {
                      const el = chatInputRef.current;
                      if (el) {
                        el.focus();
                        el.setSelectionRange(text.length, text.length);
                      }
                    }, 50);
                  }}
                  isProcessing={isProcessing}
                  isMobile={isMobile}
                  activeActionId={activeActionId}
                />

                {/* 输入框容器 — 一体式设计，flex-1 填充剩余高度，min-w-0 随模块宽度收缩；模式仅通过框内「深度思考」切换 */}
                <div className="relative flex items-end flex-1 min-h-0 min-w-0 bg-muted rounded-xl border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 transition-all">
                  {/* 斜杠命令面板 — 输入框上方浮层 */}
                  <SlashCommandPalette
                    inputValue={input}
                    onSelect={handleSlashCommandSelect}
                    onClose={() => setSlashPaletteOpen(false)}
                    visible={slashPaletteOpen}
                  />
                  {/* 附件按钮 */}
                  <input ref={fileInputRef} type="file" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setPendingFile(f);
                        toast.success(`已附加: ${f.name}`);
                        chatInputRef.current?.focus();

                        // 检测合同类文件，自动弹出合同审查卡片
                        const contractExts = /\.(pdf|docx?|txt|md)$/i;
                        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(f.name);
                        if (contractExts.test(f.name) && !isImage) {
                          store.setContractReviewFile(f);
                          store.setContractReviewVisible(true);
                          openRightPanel('smart');
                        }
                      }
                      if (e.target) e.target.value = '';
                    }}
                    accept=".pdf,.doc,.docx,.txt,image/*" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}
                    className="p-2.5 text-muted-foreground/50 hover:text-primary transition-colors disabled:opacity-50 flex-shrink-0"
                    title="上传文件">
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>

                  {/* 文本输入 */}
                  <textarea
                    ref={chatInputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // 用户手动编辑时清除快捷操作选中态
                      if (activeActionId) setActiveActionId(null);
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder={dynamicPlaceholder}
                    className="flex-1 self-stretch min-w-0 py-2.5 bg-transparent border-none resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/70 text-sm leading-relaxed"
                    style={{ minHeight: '40px' }}
                    disabled={isProcessing}
                    rows={1}
                  />

                  {/* 深度思考开关 — 输入框内右侧 */}
                  <DeepThinkToggle
                    isActive={quickActionMode === 'deep_analysis'}
                    onToggle={() => setQuickActionMode(
                      quickActionMode === 'deep_analysis' ? 'chat' : 'deep_analysis'
                    )}
                    disabled={isProcessing}
                  />

                  {/* 发送按钮 */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isProcessing}
                    className={`p-2 m-1 rounded-xl transition-all disabled:opacity-30 flex-shrink-0 ${
                      input.trim()
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-sm'
                        : 'bg-transparent text-muted-foreground/40'
                    }`}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>

                {/* 底部提示 — 更简洁 */}
                <div className="flex items-center justify-center gap-3 mt-1.5">
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${privacyHint.color}`}>
                    <PrivacyIcon className="w-2.5 h-2.5" />
                    <span>{privacyHint.text}</span>
                  </div>
                </div>
              </div>
            </div>
            </ResizablePanel>
            </ResizablePanelGroup>
          </div>
          </ResizablePanel>

          {/* ========== 水平拖拽手柄 — 聊天区与工作台之间 ========== */}
          <ResizableHandle withHandle className={isMobile ? 'opacity-0 pointer-events-none w-0' : undefined} />

          {/* ========== 右侧面板 — 可调节宽度，可折叠 ========== */}
          <ResizablePanel
            ref={rightPanelRef}
            defaultSize={0}
            collapsible
            collapsedSize={0}
            minSize={20}
            onCollapse={() => { setRightPanelOpen(false); setChatWidth(100); }}
            onExpand={() => { setRightPanelOpen(true); setChatWidth(50); }}
          >
            {!isMobile && (
              <div className="bg-muted h-full overflow-hidden border-l border-border relative">
                {/* 关闭按钮 */}
                <button
                  onClick={closeRightPanel}
                  className="absolute top-2 right-2 z-10 p-1 text-muted-foreground/50 hover:text-muted-foreground hover:bg-card/60 rounded-lg transition-colors"
                  title="收起面板"
                >
                  <X className="w-4 h-4" />
                </button>
                <RightPanel
                  activeTab={store.rightPanelTab}
                  onTabChange={store.setRightPanelTab}
                  isLive={isProcessing}
                  agentResults={store.agentResults}
                  thinkingSteps={store.thinkingSteps}
                  a2uiData={store.a2uiData}
                  requirementAnalysis={store.requirementAnalysis}
                  isProcessing={isProcessing}
                  canvasContent={store.canvasContent}
                  onCanvasContentChange={handleCanvasContentChange}
                  onCanvasTitleChange={(title) => store.canvasContent && store.setCanvasContent({ ...store.canvasContent, title })}
                  onCanvasModeChange={(mode) => store.canvasContent && store.setCanvasContent({ ...store.canvasContent, type: mode })}
                  onCanvasAIOptimize={handleCanvasAIOptimize}
                  onCanvasSuggestionAction={handleCanvasSuggestionAction}
                  onForwardToLawyer={handleForwardToLawyer}
                  onInitiateSigning={handleInitiateSigning}
                  onCanvasSaveAsDocument={handleCanvasSaveAsDocument}
                  canvasSaved={canvasSaved}
                  analysisData={store.analysisData}
                  onWorkspaceConfirm={handleWorkspaceConfirm}
                  onWorkspaceAction={handleWorkspaceAction}
                  onSupplementInput={handleWorkspaceSupplementInput}
                />
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Mobile Panel — 底部抽屉（从底部滑入，覆盖 80% 高度） */}
        <AnimatePresence>
          {isMobile && showContextPanel && (
            <>
              {/* 遮罩层 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setShowContextPanel(false)}
              />
              {/* 底部抽屉面板 */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-card flex flex-col rounded-t-2xl shadow-2xl"
                style={{ maxHeight: '85vh' }}
              >
                {/* 拖拽指示器 */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-border rounded-full" />
                </div>
                <div className="px-4 pb-2 flex justify-between items-center border-b border-border">
                  <h3 className="font-bold text-base text-foreground">工作台</h3>
                  <button
                    onClick={() => setShowContextPanel(false)}
                    className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <RightPanel
                    activeTab={store.rightPanelTab}
                    onTabChange={store.setRightPanelTab}
                    isLive={isProcessing}
                    agentResults={store.agentResults}
                    thinkingSteps={store.thinkingSteps}
                    a2uiData={store.a2uiData}
                    requirementAnalysis={store.requirementAnalysis}
                    isProcessing={isProcessing}
                    canvasContent={store.canvasContent}
                    onCanvasContentChange={handleCanvasContentChange}
                    onCanvasTitleChange={(title) => store.canvasContent && store.setCanvasContent({ ...store.canvasContent, title })}
                    onCanvasModeChange={(mode) => store.canvasContent && store.setCanvasContent({ ...store.canvasContent, type: mode })}
                    onCanvasAIOptimize={handleCanvasAIOptimize}
                    onCanvasSuggestionAction={handleCanvasSuggestionAction}
                    onForwardToLawyer={handleForwardToLawyer}
                    onInitiateSigning={handleInitiateSigning}
                    onCanvasSaveAsDocument={handleCanvasSaveAsDocument}
                    canvasSaved={canvasSaved}
                    analysisData={store.analysisData}
                    onWorkspaceConfirm={handleWorkspaceConfirm}
                    onWorkspaceAction={handleWorkspaceAction}
                    onSupplementInput={handleWorkspaceSupplementInput}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 删除对话确认弹窗 */}
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card rounded-2xl shadow-2xl p-6 w-80 mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-50 rounded-full"><Trash2 className="w-5 h-5 text-red-500" /></div>
                  <h3 className="text-lg font-semibold text-foreground">确认删除</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  确定要删除这个对话吗？删除后将无法恢复。
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                    取消
                  </button>
                  <button onClick={confirmDeleteConversation}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                    确认删除
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


// ========== 引导式问答气泡组件 — v3 优化版 ==========
// 核心改进：
// 1. 选择后立即锁定（不可修改、不可多选）
// 2. 提交后不再输出选择内容到对话流（直接显示"已确认"状态）
// 3. 提交后的选择以紧凑标签形式展示，不重复出现
function ClarificationBubble({ message, questions, originalContent, onSubmit, disabled }: {
  message: string;
  questions: { question: string; options: string[] }[];
  originalContent: string;
  onSubmit: (originalContent: string, selections: Record<string, string>) => void;
  disabled: boolean;
}) {
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
    onSubmit(originalContent, valid);
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
                <span key={q} className="inline-flex items-center gap-1 px-2 py-1 bg-card rounded-lg text-[11px] text-foreground border border-green-200">
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
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground ml-1">
          <Sparkles className="h-3 w-3 text-amber-500" /> 需求确认
        </div>
        <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3.5 shadow-sm">
          <p className="text-sm text-foreground mb-3 leading-relaxed">{message}</p>
          <div className="space-y-3">
            {questions.map((q, qi) => {
              const isAnswered = !!selections[q.question];
              return (
                <div key={qi}>
                  <p className="text-xs font-medium text-foreground mb-1.5">{q.question}</p>
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
                              ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                              : isLocked
                              ? 'bg-muted text-muted-foreground/40 border-border cursor-not-allowed'
                              : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary hover:bg-primary/10 cursor-pointer active:scale-95'
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
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
                >
                  <span>确认并继续</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {!allAnswered && (
            <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
              请逐一选择 · 已完成 {answeredCount}/{questions.length}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
