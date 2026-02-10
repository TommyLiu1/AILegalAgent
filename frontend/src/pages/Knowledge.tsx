/**
 * 知识中心 - 左侧边栏 + 内容区布局
 * 导航项：智慧搜索 | 知识库 | 知识图谱 | 经验 | 进化
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Database, Network, Brain, Zap,
  BookOpen
} from 'lucide-react'

import { SmartSearch } from '@/components/knowledge-center/SmartSearch'
import { KnowledgeBaseManager } from '@/components/knowledge-center/KnowledgeBaseManager'
import { KnowledgeGraphExplorer } from '@/components/knowledge-center/KnowledgeGraphExplorer'
import { ExperienceMemory, EvolutionEngine } from '@/components/knowledge-center/ExperienceCenter'

const NAV_ITEMS = [
  {
    id: 'search',
    label: '智慧搜索',
    icon: Search,
    accent: '#6366f1',        // indigo
    bgActive: 'bg-indigo-50',
    textActive: 'text-indigo-700',
    iconActive: 'text-indigo-600',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'bases',
    label: '知识库',
    icon: Database,
    accent: '#0ea5e9',        // sky
    bgActive: 'bg-sky-50',
    textActive: 'text-sky-700',
    iconActive: 'text-sky-600',
    dotColor: 'bg-sky-500',
  },
  {
    id: 'graph',
    label: '知识图谱',
    icon: Network,
    accent: '#8b5cf6',        // violet
    bgActive: 'bg-violet-50',
    textActive: 'text-violet-700',
    iconActive: 'text-violet-600',
    dotColor: 'bg-violet-500',
  },
  {
    id: 'experience',
    label: '经验',
    icon: Brain,
    accent: '#f59e0b',        // amber
    bgActive: 'bg-amber-50',
    textActive: 'text-amber-700',
    iconActive: 'text-amber-600',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'evolution',
    label: '进化',
    icon: Zap,
    accent: '#10b981',        // emerald
    bgActive: 'bg-emerald-50',
    textActive: 'text-emerald-700',
    iconActive: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
  },
] as const

type NavId = typeof NAV_ITEMS[number]['id']

export default function Knowledge() {
  const [activeNav, setActiveNav] = useState<NavId>('search')

  return (
    <div className="h-full flex bg-white">
      {/* ====== 左侧边栏 ====== */}
      <aside className="w-48 flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/60">
        {/* 头部标识 */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">知识中心</h2>
              <p className="text-[10px] text-slate-400 leading-tight">Knowledge Hub</p>
            </div>
          </div>
        </div>

        {/* 导航列表 */}
        <nav className="flex-1 px-2.5 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative group ${
                  isActive
                    ? `${item.bgActive} ${item.textActive}`
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                {/* 左侧激活指示条 */}
                {isActive && (
                  <motion.div
                    layoutId="knowledge-nav-indicator"
                    className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${item.dotColor}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? item.iconActive : 'text-slate-400 group-hover:text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* 底部装饰 */}
        <div className="px-4 py-4">
          <div className="text-[10px] text-slate-300 leading-relaxed">
            RAG · Neo4j · RLHF-Lite
          </div>
        </div>
      </aside>

      {/* ====== 主内容区 ====== */}
      <main className="flex-1 overflow-hidden bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeNav}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="h-full"
          >
            {activeNav === 'search' && <SmartSearch />}
            {activeNav === 'bases' && <KnowledgeBaseManager />}
            {activeNav === 'graph' && <KnowledgeGraphExplorer />}
            {activeNav === 'experience' && <ExperienceMemory />}
            {activeNav === 'evolution' && <EvolutionEngine />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
