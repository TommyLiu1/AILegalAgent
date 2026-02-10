/**
 * 智慧搜索 - 混合搜索 + RAG问答 + AI深度研究
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Sparkles, Loader2, ExternalLink, BookMarked, X,
  ChevronRight, MessageSquare
} from 'lucide-react'
import { knowledgeApi } from '@/lib/api'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface SearchResult {
  id: string
  title: string
  content: string
  source?: string
  score: number
  match_type?: string
  metadata?: any
}

export function SmartSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<'hybrid' | 'rag' | 'research'>('hybrid')

  // 深度研究
  const [isResearching, setIsResearching] = useState(false)
  const [researchReport, setResearchReport] = useState<any | null>(null)
  const [showReport, setShowReport] = useState(false)

  // RAG 问答
  const [ragAnswer, setRagAnswer] = useState<{ answer: string; sources: any[] } | null>(null)
  const [isAsking, setIsAsking] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    if (searchMode === 'research') {
      await handleDeepResearch()
      return
    }

    if (searchMode === 'rag') {
      await handleRAGQuery()
      return
    }

    setLoading(true)
    setRagAnswer(null)
    setShowReport(false)
    try {
      const data = await knowledgeApi.search(searchQuery)
      setResults(data)
    } catch (error: any) {
      toast.error(error.message || '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRAGQuery = async () => {
    if (!searchQuery.trim()) return
    setIsAsking(true)
    setResults([])
    setShowReport(false)
    try {
      const result = await knowledgeApi.ragQuery(searchQuery)
      setRagAnswer(result)
    } catch (error: any) {
      toast.error(error.message || 'RAG 问答失败')
    } finally {
      setIsAsking(false)
    }
  }

  const handleDeepResearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('请先输入研究课题')
      return
    }
    setIsResearching(true)
    setShowReport(true)
    setResearchReport(null)
    setResults([])
    setRagAnswer(null)
    try {
      const result = await knowledgeApi.deepResearch(searchQuery)
      setResearchReport(result)
      toast.success('研究报告生成完成')
    } catch (error: any) {
      toast.error(error.message || '研究失败')
      setShowReport(false)
    } finally {
      setIsResearching(false)
    }
  }

  const modeConfig = {
    hybrid: { label: '混合检索', icon: Search, color: 'bg-slate-900 hover:bg-slate-800' },
    rag: { label: 'RAG问答', icon: MessageSquare, color: 'bg-emerald-600 hover:bg-emerald-700' },
    research: { label: '深度研究', icon: Sparkles, color: 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90' },
  }

  const currentMode = modeConfig[searchMode]

  return (
    <div className="h-full flex flex-col">
      {/* 搜索头部 */}
      <div className="p-6 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">智慧搜索引擎</h2>
              <p className="text-xs text-slate-500">混合语义搜索 · RAG智能问答 · AI深度研究</p>
            </div>
          </div>

          {/* 搜索模式切换 */}
          <div className="flex gap-1.5 mb-3 p-1 bg-slate-100 rounded-xl w-fit">
            {Object.entries(modeConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSearchMode(key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  searchMode === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <config.icon className="w-3.5 h-3.5" />
                {config.label}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={
                  searchMode === 'hybrid' ? '搜索法律条文、案例、合同模板...' :
                  searchMode === 'rag' ? '输入法律问题，AI将结合知识库为您解答...' :
                  '输入法律研究课题，生成深度分析报告...'
                }
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-900 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || isResearching || isAsking}
              className={`flex items-center gap-2 px-5 py-3 text-white rounded-xl text-sm font-medium shadow-lg transition-all active:scale-95 disabled:opacity-50 ${currentMode.color}`}
            >
              {(loading || isResearching || isAsking) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <currentMode.icon className="w-4 h-4" />
              )}
              {currentMode.label}
            </button>
          </div>
        </div>
      </div>

      {/* 结果区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* RAG 问答结果 */}
          <AnimatePresence>
            {ragAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-b from-emerald-50/50 to-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/30">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-900 text-sm">RAG 智能回答</span>
                  </div>
                  <button onClick={() => setRagAnswer(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="prose prose-emerald max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{ragAnswer.answer}</ReactMarkdown>
                  </div>
                  {ragAnswer.sources?.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">参考来源</h5>
                      <div className="flex flex-wrap gap-2">
                        {ragAnswer.sources.map((s: any, i: number) => (
                          <span key={i} className="text-[11px] px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                            {s.title || s.source || `来源 ${i+1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* RAG 加载中 */}
          {isAsking && (
            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
              <div className="flex items-center gap-3 text-emerald-600 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">正在检索知识库并生成回答...</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-4 bg-emerald-100/50 rounded w-3/4" />
                <div className="h-4 bg-emerald-100/50 rounded w-full" />
                <div className="h-4 bg-emerald-100/50 rounded w-5/6" />
              </div>
            </div>
          )}

          {/* 深度研究报告 */}
          <AnimatePresence>
            {showReport && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-b from-indigo-50/50 to-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-900 text-sm">AI 深度法律研究报告</span>
                  </div>
                  <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6">
                  {isResearching ? (
                    <div className="space-y-4 py-4">
                      <div className="flex items-center gap-3 text-indigo-600 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">正在调取多维案例并生成深度分析...</span>
                      </div>
                      <div className="h-4 bg-indigo-100/50 rounded w-3/4" />
                      <div className="h-4 bg-indigo-100/50 rounded w-full" />
                      <div className="h-4 bg-indigo-100/50 rounded w-5/6" />
                    </div>
                  ) : researchReport ? (
                    <div className="prose prose-indigo max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{researchReport.content}</ReactMarkdown>
                      {researchReport.citations?.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BookMarked className="w-3.5 h-3.5" />
                            研究引用库
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {researchReport.citations.map((cite: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                                <ChevronRight className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                <span className="font-medium truncate">{cite.name || cite.case_number}</span>
                                {cite.article && <span className="text-slate-400 flex-shrink-0">第{cite.article}条</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 搜索结果列表 */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-1/4 mb-3" />
                  <div className="h-3 bg-slate-50 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              ))
            ) : results.length > 0 ? (
              results.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                >
                  {item.metadata?.keyword_match && (
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500 text-[10px] text-white font-bold rounded-bl-lg">
                      精准匹配
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter bg-blue-50 px-1.5 py-0.5 rounded">
                          {item.match_type === 'hybrid' ? '混合检索' : item.match_type === 'vector' ? '语义关联' : '文本匹配'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{item.title}</h4>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0 ml-2" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">{item.content}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">来源: {item.source || '知识库'}</span>
                    <span className="text-[10px] text-slate-300">|</span>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.score * 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{(item.score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : !showReport && !ragAnswer && !isAsking && (
              <div className="py-24 text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">探索法律知识宇宙</p>
                  <p className="text-xs text-slate-400 mt-1">输入问题或关键词，AI 将为您检索法律法规、判例、合同模板</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {['劳动合同解除条件', '知识产权侵权认定', '股权转让税务处理', '公司章程修订'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setSearchQuery(tag); }}
                      className="px-3 py-1.5 text-xs text-slate-500 bg-slate-100 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
