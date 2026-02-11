/**
 * 流式消息渲染组件 — v3 豆包风格
 * 
 * Token-by-token 流式渲染 + Markdown 支持 + 闪烁光标
 * 匹配新版消息气泡样式（无大头像、紧凑布局）
 */

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
  agent: string;
  isStreaming: boolean;
}

export const StreamingMessage = memo(function StreamingMessage({
  content,
  agent,
  isStreaming,
}: StreamingMessageProps) {
  return (
    <div className="group">
      <div className="max-w-[85%]">
        {/* Agent 标签 */}
        {agent && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/50 mb-1.5 ml-0.5">
            <Bot className="h-3 w-3" />
            {agent}
            {isStreaming && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-medium animate-pulse">
                生成中
              </span>
            )}
          </div>
        )}
        
        {/* 消息气泡 */}
        <div className="rounded-xl rounded-bl-md px-4 py-3 bg-card border border-border text-foreground shadow-sm leading-relaxed text-sm">
          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-ul:text-foreground/80 prose-ol:text-foreground/80 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-pre:bg-gray-900 prose-pre:text-gray-100">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
});
