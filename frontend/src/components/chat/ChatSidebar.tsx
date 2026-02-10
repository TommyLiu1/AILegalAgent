/**
 * ChatSidebar Component
 * 负责显示和管理对话列表
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, Trash2, Pencil, MoreHorizontal, ThumbsUp, ThumbsDown,
  CheckSquare, Square, XCircle, PanelLeftClose, Loader2
} from 'lucide-react';
import { ConversationItem } from '@/lib/store';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface ChatSidebarProps {
  conversations: ConversationItem[];
  currentId: string;
  onNewConversation: () => void;
  onSwitchConversation: (conv: ConversationItem) => void;
  onDeleteConversation: (convId: string) => void;
  onUpdateConversationTitle: (convId: string, newTitle: string) => void;
  onToggleBatchMode: () => void;
  onSelectAll: () => void;
  onBatchDelete: () => void;
  onClose: () => void;
  // 批量模式
  batchMode?: boolean;
  selectedConvIds?: Set<string>;
  isBatchDeleting?: boolean;
  // 编辑状态
  editingConvId?: string | null;
  editingTitle?: string;
  setEditingConvId?: (id: string | null) => void;
  setEditingTitle?: (title: string) => void;
  menuOpenId?: string | null;
  setMenuOpenId?: (id: string | null) => void;
}

export function ChatSidebar({
  conversations,
  currentId,
  onNewConversation,
  onSwitchConversation,
  onDeleteConversation,
  onUpdateConversationTitle,
  onToggleBatchMode,
  onSelectAll,
  onBatchDelete,
  onClose,
  batchMode = false,
  selectedConvIds = new Set(),
  isBatchDeleting = false,
  editingConvId,
  editingTitle,
  setEditingConvId,
  setEditingTitle,
  menuOpenId,
  setMenuOpenId,
}: ChatSidebarProps) {
  const formatConvDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleStartRename = (conv: ConversationItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMenuOpenId?.(null);
    setEditingConvId?.(conv.id);
    setEditingTitle?.(conv.title || '');
  };

  const handleFinishRename = async () => {
    if (!editingConvId) return;
    const trimmed = editingTitle?.trim() || '';
    if (!trimmed) {
      setEditingConvId?.(null);
      return;
    }
    onUpdateConversationTitle(editingConvId, trimmed);
    setEditingConvId?.(null);
  };

  const handleToggleSelect = (convId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // 通知父组件更新选择状态
    onSelectAll(); // 这里的实现需要调整,暂时保留
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full flex-shrink-0 bg-white flex flex-col overflow-hidden border-r border-gray-200"
    >
      {/* 头部 */}
      <div className="p-3 flex flex-col gap-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {!batchMode ? (
            <>
              <button
                onClick={onNewConversation}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-1 mr-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> 新建对话
              </button>
              <button
                onClick={onToggleBatchMode}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="批量管理"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="收起侧边栏"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-700 flex-1">
                已选 {selectedConvIds.size} / {conversations.length}
              </span>
              <button
                onClick={onToggleBatchMode}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="取消"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {batchMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
            >
              {selectedConvIds.size === conversations.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> 取消全选
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" /> 全选
                </>
              )}
            </button>
            <button
              onClick={onBatchDelete}
              disabled={selectedConvIds.size === 0 || isBatchDeleting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex-1 justify-center shadow-sm"
            >
              {isBatchDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> 删除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> 删除所选 ({selectedConvIds.size})
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8 px-4">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-gray-500">暂无对话记录</p>
            <p className="text-xs mt-1 text-gray-400">开始新对话后将在此处显示</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === currentId;
            const isEditing = editingConvId === conv.id;
            const isSelected = selectedConvIds.has(conv.id);

            return (
              <div
                key={conv.id}
                onClick={() =>
                  batchMode ? handleToggleSelect(conv.id) : !isEditing && onSwitchConversation(conv)
                }
                className={`group relative mx-2 mb-0.5 rounded-lg cursor-pointer transition-colors ${
                  batchMode && isSelected
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : isActive && !batchMode
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {batchMode ? (
                    <div
                      className="flex-shrink-0"
                      onClick={(e) => handleToggleSelect(conv.id, e)}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-red-500" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  ) : (
                    <MessageSquare
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {isEditing && !batchMode ? (
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle?.(e.target.value)}
                        onBlur={handleFinishRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename();
                          if (e.key === 'Escape') setEditingConvId?.(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white text-gray-800 text-sm px-2 py-0.5 rounded border border-blue-300 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <>
                        <p
                          className={`text-sm truncate font-medium ${
                            batchMode && isSelected
                              ? 'text-red-700'
                              : isActive && !batchMode
                              ? 'text-blue-700'
                              : 'text-gray-800'
                          }`}
                        >
                          {conv.title || '未命名对话'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatConvDate(conv.last_message_at || conv.created_at)}
                          {conv.message_count > 0 && ` · ${conv.message_count}条`}
                        </p>
                      </>
                    )}
                  </div>
                  {!isEditing && !batchMode && (
                    <div
                      className={`flex items-center gap-0.5 ${
                        isActive ? 'visible' : 'invisible group-hover:visible'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId?.(menuOpenId === conv.id ? null : conv.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded transition-colors"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 菜单 */}
                <AnimatePresence>
                  {!batchMode && menuOpenId === conv.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-2 top-full z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleStartRename(conv, e)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      >
                        <Pencil className="w-3 h-3" /> 重命名
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                          setMenuOpenId?.(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" /> 删除
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* 底部统计 */}
      <div className="p-3 border-t border-gray-100 text-center">
        <p className="text-[10px] text-gray-400">共 {conversations.length} 个对话</p>
      </div>
    </motion.div>
  );
}
