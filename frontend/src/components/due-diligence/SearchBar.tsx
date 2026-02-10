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
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入企业名称进行尽调查询..."
            disabled={isSearching}
            className="w-full pl-12 pr-32 py-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:opacity-50 text-[#1C1C1E] placeholder:text-[#8E8E93]"
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || isSearching}
            whileTap={{ scale: 0.95 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            {isSearching ? '调查中...' : '开始调查'}
          </motion.button>
        </div>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[#8E8E93]">快速开始：</span>
        {quickSearchExamples.map((example) => (
          <button
            key={example}
            onClick={() => {
              setInput(example);
              onSearch(example);
            }}
            disabled={isSearching}
            className="px-3 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] rounded-full text-xs transition-colors disabled:opacity-50 active:scale-95"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
