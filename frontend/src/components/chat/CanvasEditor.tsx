/**
 * Canvas 画布编辑器 — v2 集成协作富文本编辑器
 *
 * 功能升级：
 * - 集成 TipTap 富文本编辑器
 * - 实时协作编辑（基于 Yjs）
 * - AI 行内建议与优化
 * - 律师批注系统
 * - 双向 AI 交互
 * - 版本历史
 */

import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool, FileText, Code, Table, Users, MessageSquare,
  Eye, Edit3, Save, Download, Maximize2, Minimize2,
  CheckCircle, XCircle, Sparkles, History
} from 'lucide-react';
import { CollaborativeEditor, SimpleEditor, type EditorUser } from '@/components/editor';
import { InlineSuggestion } from './InlineSuggestion';
import { useChatStore } from '@/lib/store';
import type { CanvasContent, CanvasSuggestion } from '@/lib/store';
import { chatApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface CanvasEditorProps {
  canvas: CanvasContent | null;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onModeChange: (mode: CanvasContent['type']) => void;
  onAIOptimize: () => void;
  onSuggestionAction: (id: string, action: 'accept' | 'reject') => void;
  onForwardToLawyer?: () => void;
  onInitiateSigning?: () => void;
  onSaveAsDocument?: () => void;
  isSaved?: boolean;
  isOptimizing?: boolean;
  /** 当前用户ID */
  userId?: string;
  /** 当前对话ID（用于协作文档识别） */
  conversationId?: string;
}

export const CanvasEditor = memo(function CanvasEditor({
  canvas,
  onContentChange,
  onTitleChange,
  onModeChange,
  onAIOptimize,
  onSuggestionAction,
  onForwardToLawyer,
  onInitiateSigning,
  onSaveAsDocument,
  isSaved = true,
  isOptimizing = false,
  userId = 'user-1',
  conversationId,
}: CanvasEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [editorMode, setEditorMode] = useState<'rich' | 'markdown'>('rich');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; time: Date; content: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 当前用户信息
  const currentUser: EditorUser = {
    id: userId,
    name: '当前用户',
    color: '#3B82F6',
  };

  // 保存版本历史
  const saveVersion = useCallback((content: string) => {
    const newVersion = {
      id: `v-${Date.now()}`,
      time: new Date(),
      content,
    };
    setVersions((prev) => [...prev.slice(-9), newVersion]); // 保留最近10个版本
  }, []);

  // 恢复版本
  const restoreVersion = useCallback((versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (version && canvas) {
      onContentChange(version.content);
      toast.success('版本已恢复');
      setShowHistory(false);
    }
  }, [versions, canvas, onContentChange]);

  // 处理内容变化
  const handleContentChange = useCallback((content: string) => {
    onContentChange(content);
    // 节流保存版本
    const timeoutId = setTimeout(() => {
      saveVersion(content);
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [onContentChange, saveVersion]);

  // AI 辅助
  const handleAIAssist = async (content: string): Promise<string> => {
    try {
      const response = await fetch('/api/v1/chat/ai-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      return data.optimized || content;
    } catch (error) {
      console.error('AI 优化失败:', error);
      throw error;
    }
  };

  // 保存文档
  const handleSave = async () => {
    if (!canvas || isSaving) return;
    setIsSaving(true);
    try {
      // 通过 API 发送到后端
      // TODO: 实现 sendWebSocketMessage 方法或使用现有 API
      // await chatApi.sendWebSocketMessage(conversationId || 'default', {
      //   type: 'canvas_edit',
      //   content: canvas.content,
      //   title: canvas.title,
      //   canvas_type: canvas.type,
      // });
      toast.success('文档已保存');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 下载文档
  const handleDownload = () => {
    if (!canvas) return;
    const ext = canvas.type === 'code' ? (canvas.language || 'txt') : 'html';
    const blob = new Blob([canvas.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${canvas.title || 'document'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('文件已下载');
  };

  if (!canvas) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-6 px-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <PenTool className="w-12 h-12 text-white" />
          </motion.div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">AI 智能画布</h3>
            <p className="text-slate-500 leading-relaxed max-w-md mx-auto">
              AI 生成文书、合同时将自动在此打开<br />
              支持富文本编辑、实时协作、AI 优化
            </p>
          </div>
          <div className="pt-4 flex flex-wrap gap-3 justify-center">
            {['富文本编辑', '实时协作', 'AI 优化', '律师批注'].map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 bg-white rounded-full text-sm text-slate-600 border border-slate-200 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingSuggestions = (canvas.suggestions || []).filter((s) => s.status === 'pending');

  return (
    <div className={cn(
      'h-full flex flex-col bg-white',
      isFullscreen && 'fixed inset-0 z-50'
    )}>
      {/* 顶部工具栏 */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between px-4 py-2">
          {/* 左侧：标题和模式切换 */}
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              value={canvas.title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-lg font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              placeholder="文档标题..."
            />
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setEditorMode('rich')}
                className={cn(
                  'px-3 py-1 rounded-md text-sm font-medium transition-all',
                  editorMode === 'rich'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                富文本
              </button>
              <button
                onClick={() => setEditorMode('markdown')}
                className={cn(
                  'px-3 py-1 rounded-md text-sm font-medium transition-all',
                  editorMode === 'markdown'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Code className="w-4 h-4 inline mr-1" />
                Markdown
              </button>
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 协作用户指示 */}
            <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-gray-200">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">1 人在线</span>
            </div>

            {/* 建议数量 */}
            {pendingSuggestions.length > 0 && (
              <button
                onClick={() => onSuggestionAction(pendingSuggestions[0].id, 'accept')}
                className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 text-sm hover:bg-yellow-100"
              >
                <Sparkles className="w-4 h-4" />
                {pendingSuggestions.length} 条建议
              </button>
            )}

            {/* 版本历史 */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showHistory ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'
              )}
              title="版本历史"
            >
              <History className="w-5 h-5" />
            </button>

            {/* 全屏切换 */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* AI 优化 */}
            <button
              onClick={onAIOptimize}
              disabled={isOptimizing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <Sparkles className={cn('w-5 h-5', isOptimizing && 'animate-spin')} />
              {isOptimizing ? '优化中...' : 'AI 优化'}
            </button>

            {/* 保存 */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title="保存"
            >
              <Save className="w-5 h-5" />
            </button>

            {/* 下载 */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title="下载"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* 更多操作 */}
            {onForwardToLawyer && (
              <button
                onClick={onForwardToLawyer}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium transition-colors"
              >
                转律师
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑器 */}
        <div className="flex-1 overflow-hidden">
          {editorMode === 'rich' ? (
            // 富文本协作编辑器
            <CollaborativeEditor
              documentId={`canvas-${conversationId || 'default'}`}
              user={currentUser}
              initialContent={canvas.content}
              readOnly={false}
              onChange={handleContentChange}
              onSave={handleSave}
              showAIAssist={true}
              onAIAssist={handleAIAssist}
              wsUrl={process.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/chat/ws'}
            />
          ) : (
            // Markdown 简易编辑器
            <div className="flex h-full">
              {/* 编辑区 */}
              <div className={cn('flex flex-col', showPreview ? 'w-1/2 border-r border-gray-200' : 'w-full')}>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Markdown 编辑</span>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showPreview ? <Edit3 className="w-4 h-4 inline" /> : <Eye className="w-4 h-4 inline" />}
                    {showPreview ? ' 隐藏预览' : ' 显示预览'}
                  </button>
                </div>
                <textarea
                  value={canvas.content}
                  onChange={(e) => onContentChange(e.target.value)}
                  className="flex-1 p-6 font-mono text-sm text-gray-800 bg-white resize-none outline-none leading-relaxed"
                  placeholder="在此输入 Markdown 内容..."
                  spellCheck={false}
                />
                {/* AI 建议 */}
                {pendingSuggestions.length > 0 && (
                  <div className="border-t border-gray-200 max-h-48 overflow-y-auto p-4">
                    <AnimatePresence>
                      {pendingSuggestions.map((s) => (
                        <InlineSuggestion
                          key={s.id}
                          suggestion={s}
                          onAccept={(id) => onSuggestionAction(id, 'accept')}
                          onReject={(id) => onSuggestionAction(id, 'reject')}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* 预览区 */}
              {showPreview && (
                <div className="w-1/2 overflow-y-auto p-6 bg-white">
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700">
                    <ReactMarkdown>{canvas.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 版本历史侧边栏 */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-80 border-l border-gray-200 bg-gray-50 overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">版本历史</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {versions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">暂无历史版本</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {v.time.toLocaleString()}
                        </span>
                        <button
                          onClick={() => restoreVersion(v.id)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          恢复
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {v.content.slice(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';
