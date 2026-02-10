/**
 * ChatMessages Component
 * 负责渲染消息列表
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Bot, FileText, ThumbsUp, ThumbsDown, Loader2, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ThinkingChain } from './ThinkingChain';
import { StreamingMessage } from './StreamingMessage';
import { ClarificationBubble } from './ClarificationBubble';
import type { Message } from '@/hooks';

interface ChatMessagesProps {
  messages: Message[];
  isLoadingHistory: boolean;
  isProcessing: boolean;
  thinkingSteps: any[];
  streamingContent: string;
  streamingAgent: string;
  streamingMessageId: string | null;
  onFeedback?: (message: Message, rating: number) => void;
  onClarificationResponse?: (originalContent: string, selections: Record<string, string>) => void;
}

export function ChatMessages({
  messages,
  isLoadingHistory,
  isProcessing,
  thinkingSteps,
  streamingContent,
  streamingAgent,
  streamingMessageId,
  onFeedback,
  onClarificationResponse,
}: ChatMessagesProps) {
  /**
   * 渲染单条消息
   */
  function renderMessage(message: Message) {
    // 引导式问答气泡
    if (message.type === 'clarification') {
      return (
        <ClarificationBubble
          key={message.id}
          message={message.content}
          questions={message.clarification!.questions}
          originalContent={message.clarification!.original_content}
          onSubmit={onClarificationResponse}
          disabled={isProcessing}
        />
      );
    }

    // 系统消息
    if (message.type === 'system') {
      const isError = message.metadata?.isError;
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <div
            className={`text-xs mx-auto font-medium px-4 py-1.5 rounded-full flex items-center gap-2 ${
              isError
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}
          >
            <span>{message.content}</span>
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
        <div className={`max-w-[85%]`}>
          {/* AI 消息 - Agent 标签 */}
          {!isUser && message.agent && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
              <Bot className="h-3 w-3" />
              {message.agent}
            </div>
          )}

          {/* 消息气泡 */}
          <div
            className={`rounded-2xl leading-relaxed text-sm ${
              isUser
                ? 'bg-blue-600 text-white px-4 py-2.5 rounded-br-md'
                : 'bg-white border border-gray-100 text-gray-800 px-4 py-3 rounded-bl-md shadow-sm'
            }`}
          >
            {/* 附件 */}
            {message.attachment && (
              <div
                className={`flex items-center gap-2.5 mb-2.5 p-2 rounded-lg ${
                  isUser ? 'bg-white/15' : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div
                  className={`p-1.5 rounded ${isUser ? 'bg-white/20' : 'bg-white shadow-sm'}`}
                >
                  <FileText
                    className={`w-4 h-4 ${isUser ? 'text-white' : 'text-blue-600'}`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">{message.attachment.name}</span>
                  {message.attachment.size && (
                    <span
                      className={`text-[10px] ${isUser ? 'text-white/70' : 'text-gray-400'}`}
                    >
                      {message.attachment.size}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 消息内容 */}
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-semibold prose-p:text-gray-800 prose-p:leading-relaxed">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* AI 消息底部操作栏 */}
          {!isUser && (
            <div className="flex items-center gap-2 mt-1.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-gray-300">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.memory_id && onFeedback && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onFeedback(message, 5)}
                    disabled={!!message.feedback}
                    className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${
                      message.feedback === 'up' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'
                    }`}
                    title="有帮助"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onFeedback(message, 1)}
                    disabled={!!message.feedback}
                    className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${
                      message.feedback === 'down' ? 'text-red-500' : 'text-gray-300 hover:text-red-500'
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
  }

  return (
    <div className="space-y-6">
      {/* 加载历史 */}
      {isLoadingHistory && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">正在加载对话历史...</span>
        </div>
      )}

      {/* 消息列表 */}
      {messages.map(renderMessage)}

      {/* 思考链 */}
      {thinkingSteps.length > 0 && <ThinkingChain steps={thinkingSteps} isThinking={isProcessing} />}

      {/* 流式消息 */}
      {streamingMessageId && (
        <StreamingMessage content={streamingContent} agent={streamingAgent} isStreaming={true} />
      )}

      {/* 处理中指示 */}
      {isProcessing && !streamingMessageId && thinkingSteps.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            <span className="text-sm text-gray-600">AI 正在思考...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
