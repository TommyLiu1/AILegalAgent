import { useState } from 'react';
import { motion } from 'framer-motion';
import { TemplateGallery } from './TemplateGallery';
import { AIGenerator } from './AIGenerator';
import { MyDocuments } from './MyDocuments';
import { Sparkles, FileText, FolderOpen } from 'lucide-react';

export function DocumentLibrary() {
  const [activeTab, setActiveTab] = useState<'templates' | 'ai-generate' | 'my-docs'>('templates');

  const tabs = [
    { id: 'templates', label: '文档模板', icon: FileText },
    { id: 'ai-generate', label: 'AI 生成', icon: Sparkles },
    { id: 'my-docs', label: '我的文档', icon: FolderOpen },
  ];

  return (
    <div className="h-full flex flex-col bg-[#F2F2F7]">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-[#E5E5EA] px-6 pt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#1C1C1E]">智能文档</h2>
          <p className="text-sm text-[#8E8E93] mt-1">专业法律文书模板 + AI 智能生成</p>
        </div>

        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all flex items-center gap-2 relative ${
                  activeTab === tab.id
                    ? 'text-[#007AFF]'
                    : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'templates' && <TemplateGallery />}
        {activeTab === 'ai-generate' && <AIGenerator />}
        {activeTab === 'my-docs' && <MyDocuments />}
      </div>
    </div>
  );
}