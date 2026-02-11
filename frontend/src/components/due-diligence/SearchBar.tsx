import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchBarProps {
  onSearch: (companyName: string) => void;
  isSearching: boolean;
}

export function SearchBar({ onSearch, isSearching }: SearchBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isSearching) {
      onSearch(input.trim());
    }
  };

  const quickSearchExamples = [
    '科技有限公司',
    '贸易公司',
    '建筑集团',
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入企业名称进行尽调查询..."
            disabled={isSearching}
            className="w-full pl-12 pr-32 py-4 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 text-foreground placeholder:text-muted-foreground"
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || isSearching}
            whileTap={{ scale: 0.95 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            {isSearching ? '调查中...' : '开始调查'}
          </motion.button>
        </div>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">快速开始：</span>
        {quickSearchExamples.map((example) => (
          <button
            key={example}
            onClick={() => {
              setInput(example);
              onSearch(example);
            }}
            disabled={isSearching}
            className="px-3 py-1.5 bg-muted hover:bg-border text-foreground rounded-full text-xs transition-colors disabled:opacity-50 active:scale-95"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
