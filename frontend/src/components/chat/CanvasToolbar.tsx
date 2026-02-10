/**
 * Canvas 顶部工具栏
 * 
 * 包含：标题 | 格式按钮 | 模式切换 | AI 优化 | 转发律师 | 发起签约 | 复制 | 下载
 */

import { memo } from 'react';
import { Bold, Italic, List, Code, Table, FileText, Wand2, CheckCheck, Copy, Download, ChevronDown, Users, FileSignature, Save, CheckCircle2, Loader2 } from 'lucide-react';
import type { CanvasContent } from '@/lib/store';

interface CanvasToolbarProps {
  canvas: CanvasContent;
  onTitleChange: (title: string) => void;
  onModeChange: (mode: CanvasContent['type']) => void;
  onAIOptimize: () => void;
  onAcceptAll: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onFormatAction?: (action: string) => void;
  hasSuggestions: boolean;
  onForwardToLawyer?: () => void;
  onInitiateSigning?: () => void;
  onSaveAsDocument?: () => void;
  isSaved?: boolean;
  isOptimizing?: boolean;
}

const modeOptions: { value: CanvasContent['type']; label: string; icon: React.ElementType }[] = [
  { value: 'document', label: '文档', icon: FileText },
  { value: 'code', label: '代码', icon: Code },
  { value: 'table', label: '表格', icon: Table },
];

export const CanvasToolbar = memo(function CanvasToolbar({
  canvas,
  onTitleChange,
  onModeChange,
  onAIOptimize,
  onAcceptAll,
  onCopy,
  onDownload,
  onFormatAction,
  hasSuggestions,
  onForwardToLawyer,
  onInitiateSigning,
  onSaveAsDocument,
  isSaved = true,
  isOptimizing = false,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white">
      {/* 标题 */}
      <input
        value={canvas.title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="text-sm font-bold text-gray-800 bg-transparent border-none outline-none flex-shrink-0 max-w-[200px] truncate focus:ring-0"
        placeholder="文档标题"
      />

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* 格式按钮（仅 document 模式） */}
      {canvas.type === 'document' && onFormatAction && (
        <div className="flex items-center gap-0.5">
          <ToolButton icon={Bold} onClick={() => onFormatAction('bold')} title="加粗" />
          <ToolButton icon={Italic} onClick={() => onFormatAction('italic')} title="斜体" />
          <ToolButton icon={List} onClick={() => onFormatAction('list')} title="列表" />
        </div>
      )}

      {/* 模式切换 */}
      <div className="relative group ml-auto">
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
          {modeOptions.find((m) => m.value === canvas.type)?.label || '文档'}
          <ChevronDown className="w-3 h-3" />
        </button>
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[100px] hidden group-hover:block z-10">
          {modeOptions.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                onClick={() => onModeChange(mode.value)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
                  canvas.type === mode.value ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-px h-5 bg-gray-200" />

      {/* 操作按钮 */}
      <button
        onClick={onAIOptimize}
        disabled={isOptimizing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {isOptimizing ? 'AI 优化中...' : 'AI 优化'}
      </button>

      {hasSuggestions && (
        <button
          onClick={onAcceptAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          接受全部
        </button>
      )}

      <div className="w-px h-5 bg-gray-200" />

      {/* 转发律师 */}
      {onForwardToLawyer && (
        <button
          onClick={onForwardToLawyer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
          title="转发给律师审查"
        >
          <Users className="w-3.5 h-3.5" />
          转发律师
        </button>
      )}

      {/* 发起签约 */}
      {onInitiateSigning && (
        <button
          onClick={onInitiateSigning}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
          title="发起签约/盖章流程"
        >
          <FileSignature className="w-3.5 h-3.5" />
          签约盖章
        </button>
      )}

      <div className="w-px h-5 bg-gray-200" />

      {/* 保存按钮 */}
      {onSaveAsDocument && (
        <button
          onClick={onSaveAsDocument}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          title="保存到文档库"
        >
          <Save className="w-3.5 h-3.5" />
          保存
        </button>
      )}

      {/* 保存状态指示 */}
      <span className={`text-[10px] flex items-center gap-1 ${isSaved ? 'text-green-500' : 'text-amber-500'}`}>
        {isSaved ? <><CheckCircle2 className="w-3 h-3" />已保存</> : '编辑中...'}
      </span>

      <ToolButton icon={Copy} onClick={onCopy} title="复制" />
      <ToolButton icon={Download} onClick={onDownload} title="下载" />
    </div>
  );
});

function ToolButton({
  icon: Icon,
  onClick,
  title,
}: {
  icon: React.ElementType;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
