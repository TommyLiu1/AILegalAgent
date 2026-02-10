/**
 * 文本块组件
 * AI 生成的 Markdown 富文本内容
 */

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TextBlockComponent, A2UIEventHandler } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  component: TextBlockComponent;
  onEvent: A2UIEventHandler;
}

export const TextBlock = memo(function TextBlock({ component, onEvent }: Props) {
  const { data } = component;
  const [expanded, setExpanded] = useState(!data.collapsible);

  const previewContent = data.collapsible && !expanded && data.previewLines
    ? data.content.split('\n').slice(0, data.previewLines).join('\n')
    : data.content;

  return (
    <div className={cn('a2ui-text-block', component.className)}>
      <div className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-headings:text-zinc-800 dark:prose-headings:text-zinc-200',
        'prose-p:text-zinc-600 dark:prose-p:text-zinc-400',
        'prose-a:text-blue-600 dark:prose-a:text-blue-400',
        !expanded && data.collapsible && 'line-clamp-3',
      )}>
        {data.format === 'plain' ? (
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {previewContent}
          </p>
        ) : (
          <ReactMarkdown>{previewContent}</ReactMarkdown>
        )}
      </div>

      {data.collapsible && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 transition"
        >
          {expanded ? (
            <>收起 <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>展开全部 <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
});
