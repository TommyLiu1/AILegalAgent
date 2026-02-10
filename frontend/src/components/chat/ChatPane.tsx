import { useEffect, useRef } from 'react';
import { Message } from './ChatCanvas';
import { FileText, Image, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatPaneProps {
  messages: Message[];
  isProcessing: boolean;
}

export function ChatPane({ messages, isProcessing }: ChatPaneProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.type === 'user'
                ? 'bg-[#007AFF] text-white'
                : message.type === 'system'
                ? 'bg-[#FFF8ED] text-[#FF9500] border border-[#FFD19A]'
                : 'bg-[#F2F2F7] text-[#1C1C1E]'
            }`}
          >
            {message.attachment && (
              <div className="mb-2 flex items-center gap-2 pb-2 border-b border-white/20">
                {message.attachment.type === 'file' ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <Image className="w-4 h-4" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{message.attachment.name}</p>
                  <p className="text-xs opacity-70">{message.attachment.size}</p>
                </div>
              </div>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            <p
              className={`text-xs mt-1.5 ${
                message.type === 'user' ? 'text-blue-100' : 'text-slate-500'
              }`}
            >
              {message.timestamp.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </motion.div>
      ))}
      
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-start"
        >
          <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            <span className="text-sm text-slate-600">AI 正在思�?..</span>
          </div>
        </motion.div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}