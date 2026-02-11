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
    bgActive: 'bg-primary/10',
    textActive: 'text-primary',
    iconActive: 'text-primary',
    dotColor: 'bg-primary',
  },
  {
    id: 'bases',
    label: '知识库',
    icon: Database,
    bgActive: 'bg-primary/10',
    textActive: 'text-primary',
    iconActive: 'text-primary',
    dotColor: 'bg-primary',
  },
  {
    id: 'graph',
    label: '知识图谱',
    icon: Network,
    bgActive: 'bg-primary/10',
    textActive: 'text-primary',
    iconActive: 'text-primary',
    dotColor: 'bg-primary',
  },
  {
    id: 'experience',
    label: '经验',
    icon: Brain,
    bgActive: 'bg-primary/10',
    textActive: 'text-primary',
    iconActive: 'text-primary',
    dotColor: 'bg-primary',
  },
  {
    id: 'evolution',
    label: '进化',
    icon: Zap,
    bgActive: 'bg-primary/10',
    textActive: 'text-primary',
    iconActive: 'text-primary',
    dotColor: 'bg-primary',
  },
] as const

type NavId = typeof NAV_ITEMS[number]['id']

export default function Knowledge() {
  const [activeNav, setActiveNav] = useState<NavId>('search')

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background">
      {/* ====== 小屏顶部横向滚动导航 ====== */}
      <div className="lg:hidden flex-shrink-0 border-b border-border bg-muted/60">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/25">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">知识中心</h2>
          </div>
        </div>
        <nav className="flex overflow-x-auto px-2.5 pb-2 gap-1 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all relative ${
                  isActive
                    ? `${item.bgActive} ${item.textActive}`
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? item.iconActive : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ====== 左侧边栏（大屏可见） ====== */}
      <aside className="hidden lg:flex w-full lg:w-48 flex-shrink-0 border-r border-border flex-col bg-muted/60">
        {/* 头部标识 */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/25">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight">知识中心</h2>
              <p className="text-[10px] text-muted-foreground/50 leading-tight">Knowledge Hub</p>
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
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? item.iconActive : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* 底部装饰 */}
        <div className="px-4 py-4">
          <div className="text-[10px] text-muted-foreground/50 leading-relaxed">
            RAG · Neo4j · RLHF-Lite
          </div>
        </div>
      </aside>

      {/* ====== 主内容区 ====== */}
      <main className="flex-1 overflow-hidden bg-background">
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
