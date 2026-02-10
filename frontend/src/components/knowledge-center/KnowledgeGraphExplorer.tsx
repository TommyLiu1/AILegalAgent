/**
 * 知识图谱探索器 - 3D/2D 可视化图谱浏览与实体搜索
 * 
 * 使用 react-force-graph 实现 3D 力导向图谱
 * 支持 3D 旋转、缩放、节点点击展开、粒子动画等
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, Network,
  X, Share2, ChevronRight, Layers, Box, Grid3x3,
  RotateCcw, Focus, Eye
} from 'lucide-react'
import { knowledgeCenterApi, type GraphData, type GraphStats, type GraphNode } from '@/lib/api'
import { toast } from 'sonner'
import * as THREE from 'three'
import SpriteText from 'three-spritetext'

// 节点颜色与图标配置
const NODE_CONFIG: Record<string, { color: string; emissive: string; icon: string; label: string }> = {
  query:      { color: '#64748b', emissive: '#475569', icon: '🔍', label: '查询' },
  entity:     { color: '#22c55e', emissive: '#16a34a', icon: '🏢', label: '实体' },
  law:        { color: '#3b82f6', emissive: '#2563eb', icon: '⚖️', label: '法律法规' },
  document:   { color: '#f97316', emissive: '#ea580c', icon: '📄', label: '案件文书' },
  conclusion: { color: '#a855f7', emissive: '#9333ea', icon: '💡', label: '结论' },
}

const LEGEND_ITEMS = [
  { type: 'entity',     label: '实体',     color: '#22c55e' },
  { type: 'law',        label: '法律法规', color: '#3b82f6' },
  { type: 'document',   label: '案件文书', color: '#f97316' },
  { type: 'conclusion', label: '结论',     color: '#a855f7' },
]

// 转换后端数据为 force-graph 格式
interface FGNode {
  id: string
  name: string
  type: string
  val: number
  color: string
  __data: GraphNode
}

interface FGLink {
  source: string
  target: string
  label: string
  color: string
}

function toForceGraphData(data: GraphData, centerEntity?: string) {
  const nodes: FGNode[] = data.nodes.map(n => {
    const cfg = NODE_CONFIG[n.type] || NODE_CONFIG.entity
    return {
      id: n.id,
      name: n.label,
      type: n.type,
      val: n.id === centerEntity ? 12 : 6,
      color: cfg.color,
      __data: n,
    }
  })

  const nodeIds = new Set(nodes.map(n => n.id))
  const links: FGLink[] = data.edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => ({
      source: e.source,
      target: e.target,
      label: e.label || e.relation,
      color: 'rgba(148, 163, 184, 0.4)',
    }))

  return { nodes, links }
}

export function KnowledgeGraphExplorer() {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [graphStats, setGraphStats] = useState<GraphStats | null>(null)
  const [depth, setDepth] = useState(1)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [expandingNode, setExpandingNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')
  const [autoRotate, setAutoRotate] = useState(true)
  const [showLabels, setShowLabels] = useState(true)

  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ForceGraph3DComp, setForceGraph3DComp] = useState<any>(null)
  const [ForceGraph2DComp, setForceGraph2DComp] = useState<any>(null)

  // 动态导入 react-force-graph-3d / 2d (避免联合包加载 AFRAME)
  useEffect(() => {
    Promise.all([
      import('react-force-graph-3d'),
      import('react-force-graph-2d'),
    ]).then(([mod3d, mod2d]) => {
      setForceGraph3DComp(() => mod3d.default)
      setForceGraph2DComp(() => mod2d.default)
    })
  }, [])

  // 加载图谱统计
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await knowledgeCenterApi.getGraphOverview()
        setGraphStats(data)
      } catch {
        // 静默处理
      }
    }
    loadStats()
  }, [])

  // 搜索图谱
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setSelectedNode(null)
    try {
      const data = await knowledgeCenterApi.searchGraph(searchQuery, depth)
      setGraphData(data)
      if (data.nodes.length === 0) {
        toast.info('未找到相关实体，请尝试其他关键词')
      }
    } catch (error: any) {
      toast.error(error.message || '图谱搜索失败')
    } finally {
      setLoading(false)
    }
  }

  // 展开节点
  const handleExpandNode = async (entityName: string) => {
    setExpandingNode(entityName)
    try {
      const data = await knowledgeCenterApi.getEntityRelations(entityName, depth)
      if (data.nodes.length > 0 && graphData) {
        const mergedNodes = [...graphData.nodes]
        const mergedEdges = [...graphData.edges]
        const existingNodeIds = new Set(mergedNodes.map(n => n.id))
        const existingEdgeKeys = new Set(mergedEdges.map(e => `${e.source}-${e.target}-${e.relation}`))

        for (const node of data.nodes) {
          if (!existingNodeIds.has(node.id)) {
            mergedNodes.push(node)
          }
        }
        for (const edge of data.edges) {
          const key = `${edge.source}-${edge.target}-${edge.relation}`
          if (!existingEdgeKeys.has(key)) {
            mergedEdges.push(edge)
          }
        }
        setGraphData({ nodes: mergedNodes, edges: mergedEdges })
      }
    } catch (error: any) {
      toast.error(error.message || '展开节点失败')
    } finally {
      setExpandingNode(null)
    }
  }

  // 转换后的力导图数据
  const fgData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }
    return toForceGraphData(graphData, graphData.center_entity)
  }, [graphData])

  // 节点点击
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node.id)
    // 3D 模式下聚焦到节点
    if (viewMode === '3d' && graphRef.current) {
      const distance = 120
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0)
      graphRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1200
      )
    }
  }, [viewMode])

  // 重置视角
  const handleResetView = useCallback(() => {
    if (graphRef.current) {
      if (viewMode === '3d') {
        graphRef.current.cameraPosition({ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: 0 }, 1000)
      } else {
        graphRef.current.zoomToFit(500)
      }
    }
  }, [viewMode])

  // 3D 节点绘制
  const nodeThreeObject = useCallback((node: any) => {
    const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.entity
    const group = new THREE.Group()

    // 发光球体
    const geometry = new THREE.SphereGeometry(node.val || 6, 24, 24)
    const material = new THREE.MeshPhongMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: 0.3,
      shininess: 100,
      transparent: true,
      opacity: 0.92,
    })
    const sphere = new THREE.Mesh(geometry, material)
    group.add(sphere)

    // 外层光晕
    const glowGeometry = new THREE.SphereGeometry((node.val || 6) * 1.3, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.08,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    group.add(glow)

    // 文字标签
    if (showLabels) {
      const sprite = new SpriteText(node.name)
      sprite.color = '#e2e8f0'
      sprite.textHeight = 3.5
      sprite.fontWeight = '600'
      sprite.backgroundColor = 'rgba(15, 23, 42, 0.75)'
      sprite.padding = [2, 4]
      sprite.borderRadius = 3
      sprite.position.y = -(node.val || 6) - 5
      group.add(sprite)
    }

    return group
  }, [showLabels])

  // 2D 节点绘制
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.entity
    const r = (node.val || 6) * 1.2
    const x = node.x || 0
    const y = node.y || 0

    // 光晕
    ctx.beginPath()
    ctx.arc(x, y, r * 1.5, 0, 2 * Math.PI)
    ctx.fillStyle = cfg.color + '18'
    ctx.fill()

    // 实心圆
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fillStyle = cfg.color
    ctx.fill()
    ctx.strokeStyle = cfg.color + '60'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 文字
    if (showLabels && globalScale > 0.5) {
      const fontSize = Math.max(10 / globalScale, 3)
      ctx.font = `600 ${fontSize}px "Inter", "SF Pro", system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#334155'
      const label = node.name.length > 12 ? node.name.slice(0, 12) + '…' : node.name
      ctx.fillText(label, x, y + r + 3)
    }
  }, [showLabels])

  // 3D 链接粒子
  const linkDirectionalParticles = 2
  const linkDirectionalParticleWidth = 1.5

  // 容器尺寸
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 自动旋转 (3D)
  useEffect(() => {
    if (graphRef.current && viewMode === '3d') {
      const controls = graphRef.current.controls()
      if (controls) {
        controls.autoRotate = autoRotate
        controls.autoRotateSpeed = 0.8
      }
    }
  }, [autoRotate, viewMode, fgData])

  const hasData = fgData.nodes.length > 0
  const GraphComponent = viewMode === '3d' ? ForceGraph3DComp : ForceGraph2DComp

  return (
    <div className="h-full flex flex-col">
      {/* 顶部搜索栏 */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
            <Network className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">知识图谱</h3>
            <p className="text-[10px] text-slate-400">
              {graphStats?.available
                ? `${graphStats.total_nodes} 节点 · ${graphStats.total_edges} 关系`
                : '图谱服务未连接'}
            </p>
          </div>
        </div>

        <div className="flex-1 flex gap-2 ml-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索实体：企业名、法律条文、案件..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 transition-all"
            />
          </div>

          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value={1}>1层关系</option>
            <option value={2}>2层关系</option>
            <option value={3}>3层关系</option>
          </select>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            搜索
          </button>
        </div>

        {/* 视图切换 */}
        <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-lg">
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === '3d'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === '2d'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            2D
          </button>
        </div>
      </div>

      {/* 图谱画布 */}
      <div className="flex-1 relative" ref={containerRef} style={{ background: viewMode === '3d' ? '#0f172a' : '#f8fafc' }}>
        {hasData && GraphComponent ? (
          <>
            {viewMode === '3d' ? (
              <ForceGraph3DComp
                ref={graphRef}
                graphData={fgData}
                width={dimensions.width - (selectedNode ? 288 : 0)}
                height={dimensions.height}
                backgroundColor="#0f172a"
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={false}
                onNodeClick={handleNodeClick}
                onNodeRightClick={(node: any) => handleExpandNode(node.id)}
                linkColor={(link: any) => link.color || 'rgba(148, 163, 184, 0.3)'}
                linkWidth={1.2}
                linkOpacity={0.5}
                linkDirectionalParticles={linkDirectionalParticles}
                linkDirectionalParticleWidth={linkDirectionalParticleWidth}
                linkDirectionalParticleColor={() => '#818cf8'}
                linkDirectionalParticleSpeed={0.004}
                linkLabel={(link: any) => `<span style="color:#e2e8f0;font-size:11px;background:rgba(15,23,42,0.8);padding:2px 6px;border-radius:4px">${link.label}</span>`}
                enableNodeDrag={true}
                enableNavigationControls={true}
                showNavInfo={false}
                warmupTicks={60}
                cooldownTicks={200}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            ) : (
              <ForceGraph2DComp
                ref={graphRef}
                graphData={fgData}
                width={dimensions.width - (selectedNode ? 288 : 0)}
                height={dimensions.height}
                backgroundColor="#f8fafc"
                nodeCanvasObject={nodeCanvasObject}
                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                  const r = (node.val || 6) * 1.5
                  ctx.beginPath()
                  ctx.arc(node.x || 0, node.y || 0, r, 0, 2 * Math.PI)
                  ctx.fillStyle = color
                  ctx.fill()
                }}
                onNodeClick={handleNodeClick}
                onNodeRightClick={(node: any) => handleExpandNode(node.id)}
                linkColor={() => 'rgba(148, 163, 184, 0.35)'}
                linkWidth={1.5}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleColor={() => '#818cf8'}
                linkLabel={(link: any) => link.label}
                enableNodeDrag={true}
                warmupTicks={40}
                cooldownTicks={150}
                d3AlphaDecay={0.025}
                d3VelocityDecay={0.3}
              />
            )}

            {/* 工具面板 */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {/* 图例 */}
              <div className={`rounded-xl border shadow-lg p-3 ${
                viewMode === '3d'
                  ? 'bg-slate-900/80 backdrop-blur-md border-slate-700'
                  : 'bg-white/90 backdrop-blur-sm border-slate-200'
              }`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className={`w-3.5 h-3.5 ${viewMode === '3d' ? 'text-slate-400' : 'text-slate-500'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    viewMode === '3d' ? 'text-slate-400' : 'text-slate-500'
                  }`}>图例</span>
                </div>
                <div className="space-y-1.5">
                  {LEGEND_ITEMS.map(item => (
                    <div key={item.type} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <span className={`text-[11px] ${viewMode === '3d' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={`mt-2 pt-2 border-t text-[10px] ${
                  viewMode === '3d' ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'
                }`}>
                  <p>左键点击 = 查看详情</p>
                  <p>右键点击 = 展开关系</p>
                  {viewMode === '3d' && <p>拖拽旋转 · 滚轮缩放</p>}
                </div>
              </div>

              {/* 控制按钮 */}
              <div className={`flex flex-col gap-1 rounded-xl border shadow-lg p-1.5 ${
                viewMode === '3d'
                  ? 'bg-slate-900/80 backdrop-blur-md border-slate-700'
                  : 'bg-white/90 backdrop-blur-sm border-slate-200'
              }`}>
                <ControlButton
                  icon={RotateCcw}
                  label="重置视角"
                  onClick={handleResetView}
                  dark={viewMode === '3d'}
                />
                {viewMode === '3d' && (
                  <ControlButton
                    icon={Focus}
                    label={autoRotate ? '停止旋转' : '自动旋转'}
                    onClick={() => setAutoRotate(!autoRotate)}
                    active={autoRotate}
                    dark
                  />
                )}
                <ControlButton
                  icon={Eye}
                  label={showLabels ? '隐藏标签' : '显示标签'}
                  onClick={() => setShowLabels(!showLabels)}
                  active={showLabels}
                  dark={viewMode === '3d'}
                />
              </div>
            </div>

            {/* 统计面板 */}
            <div className={`absolute top-4 right-4 z-10 rounded-xl border shadow-lg p-3 min-w-[140px] ${
              selectedNode ? 'hidden' : ''
            } ${viewMode === '3d'
              ? 'bg-slate-900/80 backdrop-blur-md border-slate-700'
              : 'bg-white/90 backdrop-blur-sm border-slate-200'
            }`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                viewMode === '3d' ? 'text-slate-400' : 'text-slate-500'
              }`}>当前图谱</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className={`text-xs ${viewMode === '3d' ? 'text-slate-400' : 'text-slate-500'}`}>节点</span>
                  <span className={`text-xs font-bold ${viewMode === '3d' ? 'text-white' : 'text-slate-900'}`}>
                    {fgData.nodes.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-xs ${viewMode === '3d' ? 'text-slate-400' : 'text-slate-500'}`}>关系</span>
                  <span className={`text-xs font-bold ${viewMode === '3d' ? 'text-white' : 'text-slate-900'}`}>
                    {fgData.links.length}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* 空状态 */
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative w-28 h-28 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-3xl animate-pulse" />
                <div className="absolute inset-2 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl flex items-center justify-center shadow-inner">
                  <Network className="w-12 h-12 text-purple-300" />
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-semibold text-lg">探索 3D 知识图谱</p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  搜索实体名称、法律条文或案件编号，在沉浸式3D空间中发现法律知识之间的隐藏关联。
                  支持旋转、缩放、节点展开等交互操作。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['合同法', '知识产权', '劳动争议', '公司法', '民法典'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="px-3.5 py-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {graphStats?.available && (
                <div className="mt-8 grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                    <div className="text-3xl font-bold text-slate-900">{graphStats.total_nodes}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-medium">知识节点</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                    <div className="text-3xl font-bold text-slate-900">{graphStats.total_edges}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-medium">关系边</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 展开提示 */}
        <AnimatePresence>
          {expandingNode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-purple-600 text-white px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">展开 "{expandingNode}" 的关系...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 节点详情侧边栏 */}
        <AnimatePresence>
          {selectedNode && graphData && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`absolute top-0 right-0 w-72 h-full z-20 border-l shadow-2xl p-4 overflow-y-auto ${
                viewMode === '3d'
                  ? 'bg-slate-900/95 backdrop-blur-xl border-slate-700 text-white'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-bold text-sm ${viewMode === '3d' ? 'text-white' : 'text-slate-900'}`}>
                  节点详情
                </h4>
                <button
                  onClick={() => setSelectedNode(null)}
                  className={`p-1 rounded-lg transition-colors ${
                    viewMode === '3d' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const node = graphData.nodes.find(n => n.id === selectedNode)
                if (!node) return null
                const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.entity
                const relatedEdges = graphData.edges.filter(
                  e => e.source === selectedNode || e.target === selectedNode
                )

                return (
                  <div className="space-y-4">
                    {/* 节点卡片 */}
                    <div className="text-center p-5 rounded-xl" style={{
                      background: viewMode === '3d'
                        ? `linear-gradient(135deg, ${cfg.color}20, ${cfg.color}08)`
                        : `linear-gradient(135deg, ${cfg.color}15, ${cfg.color}05)`,
                      border: `1px solid ${cfg.color}30`,
                    }}>
                      <div className="text-4xl mb-2">{cfg.icon}</div>
                      <div className="font-bold text-sm" style={{ color: viewMode === '3d' ? '#e2e8f0' : cfg.color }}>
                        {node.label}
                      </div>
                      <div className="text-[10px] mt-1 px-2.5 py-0.5 rounded-full inline-block" style={{
                        backgroundColor: cfg.color + '20',
                        color: viewMode === '3d' ? cfg.color : cfg.color,
                      }}>
                        {cfg.label}
                      </div>
                    </div>

                    {/* 关联关系 */}
                    <div>
                      <h5 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                        viewMode === '3d' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        关联关系 ({relatedEdges.length})
                      </h5>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {relatedEdges.map((edge, i) => (
                          <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-[11px] ${
                            viewMode === '3d' ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-50 text-slate-500'
                          }`}>
                            <ChevronRight className="w-3 h-3 text-purple-500 flex-shrink-0" />
                            <span className="truncate">
                              {edge.source === selectedNode ? (
                                <><b>{edge.relation}</b> → {edge.target}</>
                              ) : (
                                <>{edge.source} → <b>{edge.relation}</b></>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <button
                      onClick={() => handleExpandNode(selectedNode)}
                      disabled={!!expandingNode}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-all ${
                        viewMode === '3d'
                          ? 'bg-purple-600 text-white hover:bg-purple-500'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      }`}
                    >
                      {expandingNode ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      展开更多关系
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** 控制按钮组件 */
function ControlButton({ icon: Icon, label, onClick, active, dark }: {
  icon: any; label: string; onClick: () => void; active?: boolean; dark?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-all ${
        dark
          ? active
            ? 'bg-purple-600 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
          : active
            ? 'bg-purple-100 text-purple-700'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
