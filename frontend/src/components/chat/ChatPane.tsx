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
            className={`max-w-[80%] rounded-xl px-4 py-3 ${
              message.type === 'user'
                ? 'bg-primary text-primary-foreground'
                : message.type === 'system'
                ? 'bg-warning-light text-warning border border-warning/30'
                : 'bg-muted text-foreground'
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
                message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
          <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">AI 正在思考...</span>
          </div>
        </motion.div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}