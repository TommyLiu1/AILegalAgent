import { useState, useEffect } from 'react'
import { 
  Settings2, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Loader2, 
  Server, 
  Cpu, 
  Zap, 
  Box,
  RefreshCw,
  Activity,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import Dashboard from './Dashboard'

import { llmApi, mcpApi, LLMConfig, LLMProvider, McpServerConfig, McpServerCreate } from '@/lib/api'

export default function Settings() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="container mx-auto py-6 space-y-8 flex-1 overflow-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理模型配置、第三方服务集成、监控看板和系统参数
          </p>
        </div>

        <Tabs defaultValue="llm" className="space-y-4">
          <TabsList>
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              模型配置 (LLM)
            </TabsTrigger>
            <TabsTrigger value="mcp" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              服务集成 (MCP)
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              监控看板
            </TabsTrigger>
          </TabsList>

          <TabsContent value="llm" className="space-y-4">
            <LlmSettingsPanel />
          </TabsContent>

          <TabsContent value="mcp" className="space-y-4">
            <McpSettingsPanel />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="rounded-lg border bg-card overflow-hidden" style={{ minHeight: '600px' }}>
              <Dashboard />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ============ LLM设置面板组件 ============

function LlmSettingsPanel() {
  const [configs, setConfigs] = useState<LLMConfig[]>([])
  const [providers, setProviders] = useState<Record<string, LLMProvider>>({})
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [configsData, providersData] = await Promise.all([
        llmApi.listConfigs(),
        llmApi.getProviders()
      ])
      setConfigs(configsData.items)
      setProviders(providersData)
    } catch (error: any) {
      toast.error('加载配置失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模型配置吗？')) return
    try {
      await llmApi.deleteConfig(id)
      toast.success('配置已删除')
      loadData()
    } catch (error: any) {
      toast.error('删除失败: ' + error.message)
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      await llmApi.toggleActive(id)
      loadData() // Refresh to show updated state
    } catch (error: any) {
      toast.error('操作失败: ' + error.message)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await llmApi.setDefault(id)
      toast.success('已设置为默认模型')
      loadData()
    } catch (error: any) {
      toast.error('设置失败: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">大语言模型配置</h2>
          <p className="text-sm text-muted-foreground">
            配置和管理用于AI助手的各类大模型，支持国际/国内主流模型及本地模型
          </p>
        </div>
        <Button onClick={() => {
          setEditingConfig(null)
          setShowDialog(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          添加模型
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map(config => (
          <Card key={config.id} className={config.is_active ? '' : 'opacity-60'}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {providers[config.provider]?.name || config.provider}
                  </Badge>
                  {config.is_default && (
                    <Badge variant="outline" className="border-primary text-primary">默认</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(config.id)} title={config.is_active ? "禁用" : "启用"}>
                    {config.is_active ? <Activity className="h-4 w-4 text-green-500" /> : <Activity className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditingConfig(config)
                    setShowDialog(true)
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(config.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-base mt-2">{config.name}</CardTitle>
              <CardDescription>{config.model_name}</CardDescription>
            </CardHeader>
            <CardContent className="pb-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">类型:</span>
                <span className="capitalize">{config.config_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Base:</span>
                <span className="truncate max-w-[180px]" title={config.api_base_url}>{config.api_base_url || '默认'}</span>
              </div>
              {config.total_calls !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">调用次数:</span>
                  <span>{config.total_calls}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              {!config.is_default && config.is_active && (
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => handleSetDefault(config.id)}>
                  设为默认
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">暂无模型配置，请点击右上角添加</p>
        </div>
      )}

      {showDialog && (
        <LlmConfigDialog
          editingConfig={editingConfig}
          providers={providers}
          onClose={() => setShowDialog(false)}
          onSave={() => {
            setShowDialog(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

function LlmConfigDialog({ 
  editingConfig, 
  providers, 
  onClose, 
  onSave 
}: { 
  editingConfig: LLMConfig | null
  providers: Record<string, LLMProvider>
  onClose: () => void
  onSave: () => void 
}) {
  const [form, setForm] = useState({
    name: editingConfig?.name || '',
    provider: editingConfig?.provider || 'openai',
    model_name: editingConfig?.model_name || '',
    api_key: '',
    api_base_url: editingConfig?.api_base_url || '',
    config_type: editingConfig?.config_type || 'llm',
    max_tokens: editingConfig?.max_tokens || 4096,
    temperature: editingConfig?.temperature || 0.7,
    is_default: editingConfig?.is_default || false
  })
  
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  // 当提供商改变时，自动填充默认Base URL
  const handleProviderChange = (provider: string) => {
    const providerConfig = providers[provider]
    setForm(prev => ({
      ...prev,
      provider,
      api_base_url: providerConfig?.base_url || '',
      model_name: providerConfig?.models?.llm?.[0] || ''
    }))
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      // 如果是编辑模式且未修改API Key，则使用配置ID测试
      if (editingConfig && !form.api_key) {
        const res = await llmApi.testConfigConnection(editingConfig.id)
        if (res.success) {
          toast.success(`连接成功! 延迟: ${res.response_time_ms?.toFixed(0)}ms`)
        } else {
          toast.error(`连接失败: ${res.error}`)
        }
      } else {
        // 否则使用表单数据测试
        const res = await llmApi.testConnection({
          provider: form.provider,
          api_key: form.api_key,
          api_base_url: form.api_base_url,
          model_name: form.model_name
        })
        if (res.success) {
          toast.success(`连接成功! 延迟: ${res.response_time_ms?.toFixed(0)}ms`)
        } else {
          toast.error(`连接失败: ${res.error}`)
        }
      }
    } catch (e: any) {
      toast.error('测试出错: ' + e.message)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.provider || !form.model_name) {
      return toast.error('请填写必要信息')
    }
    
    setSaving(true)
    try {
      const data: any = { ...form }
      // 如果是编辑且API Key为空，则不发送该字段（保持原值）
      if (editingConfig && !data.api_key) {
        delete data.api_key
      }
      
      if (editingConfig) {
        await llmApi.updateConfig(editingConfig.id, data)
      } else {
        await llmApi.createConfig(data)
      }
      toast.success('保存成功')
      onSave()
    } catch (e: any) {
      toast.error('保存失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const currentProvider = providers[form.provider]

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingConfig ? '编辑模型配置' : '添加模型配置'}</DialogTitle>
          <DialogDescription>
            配置大语言模型的连接参数，支持 OpenAI 兼容接口
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>配置名称</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="给这个配置起个名字" 
                />
              </div>
              <div className="space-y-2">
                <Label>提供商</Label>
                <Select value={form.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(providers).map(([key, p]) => (
                      <SelectItem key={key} value={key}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模型名称</Label>
                <div className="relative">
                  <Input 
                    value={form.model_name} 
                    onChange={e => setForm({...form, model_name: e.target.value})}
                    placeholder="输入或选择模型" 
                    list="model-options"
                  />
                  <datalist id="model-options">
                    {currentProvider?.models?.llm?.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentProvider?.models?.llm ? `推荐: ${currentProvider.models.llm.slice(0, 3).join(', ')}...` : '请输入模型ID'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>配置类型</Label>
                <Select value={form.config_type} onValueChange={v => setForm({...form, config_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llm">对话模型 (LLM)</SelectItem>
                    <SelectItem value="embedding">向量模型 (Embedding)</SelectItem>
                    <SelectItem value="reranker">重排序模型 (Reranker)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input 
                value={form.api_base_url} 
                onChange={e => setForm({...form, api_base_url: e.target.value})}
                placeholder="https://api.openai.com/v1" 
              />
              {currentProvider?.note && (
                <p className="text-xs text-amber-600">{currentProvider.note}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>API Key {editingConfig && '(留空保持不变)'}</Label>
              <Input 
                type="password"
                value={form.api_key} 
                onChange={e => setForm({...form, api_key: e.target.value})}
                placeholder="sk-..." 
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>最大Token数</Label>
                <Input 
                  type="number"
                  value={form.max_tokens} 
                  onChange={e => setForm({...form, max_tokens: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>温度 (Temperature)</Label>
                <Input 
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={form.temperature} 
                  onChange={e => setForm({...form, temperature: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                id="is-default" 
                checked={form.is_default}
                onCheckedChange={c => setForm({...form, is_default: c})}
              />
              <Label htmlFor="is-default">设为默认模型</Label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            测试连接
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ MCP设置面板组件 ============

const MCP_TEMPLATES = [
  {
    name: 'brave-search',
    description: 'Brave Search web search capability',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: '' }
  },
  {
    name: 'google-maps',
    description: 'Google Maps location services',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    env: { GOOGLE_MAPS_API_KEY: '' }
  },
  {
    name: 'amap-maps',
    description: '高德地图 (Amap) - 路线规划与POI搜索',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@amap/amap-maps-mcp-server'],
    env: { AMAP_MAPS_API_KEY: '' }
  },
  {
    name: 'github',
    description: 'GitHub repository management',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' }
  },
  {
    name: 'postgres',
    description: 'PostgreSQL database access',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://user:password@localhost/db']
  }
]

function McpSettingsPanel() {
  const [servers, setServers] = useState<McpServerConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await mcpApi.listServers()
      setServers(data)
    } catch (error: any) {
      toast.error('加载MCP服务失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleConnect = async (id: string) => {
    setConnecting(id)
    try {
      const result = await mcpApi.connect(id)
      toast.success(`连接成功! 发现 ${result.tools_count} 个工具`)
      loadData()
    } catch (error: any) {
      toast.error('连接失败: ' + error.message)
    } finally {
      setConnecting(null)
    }
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个服务配置吗？')) return
    try {
      await mcpApi.delete(id)
      toast.success('服务已删除')
      loadData()
    } catch (error: any) {
      toast.error('删除失败: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium">第三方服务集成 (MCP)</h2>
            <p className="text-sm text-muted-foreground">
              配置外部 Model Context Protocol 服务，扩展 Agent 的能力（如搜索、地图、数据库等）
            </p>
          </div>
          <button
            onClick={() => {
              setEditingServer(null)
              setShowAddDialog(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            添加服务
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map(server => (
          <div key={server.id} className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Box className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">{server.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {server.type}
                    </span>
                    {server.is_enabled ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">已启用</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">已禁用</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleConnect(server.id)}
                  disabled={!!connecting}
                  className="p-1.5 rounded hover:bg-muted"
                  title="重新连接/刷新工具"
                >
                  {connecting === server.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditingServer(server)
                    setShowAddDialog(true)
                  }}
                  className="p-1.5 rounded hover:bg-muted"
                  title="编辑"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(server.id)}
                  className="p-1.5 rounded hover:bg-muted text-red-500"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {server.description && (
              <p className="text-sm text-muted-foreground mb-3">{server.description}</p>
            )}
            
            <div className="text-xs bg-muted/50 p-2 rounded border font-mono truncate mb-3">
              {server.type === 'stdio' ? server.command : server.url}
            </div>
            
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground mb-1">可用工具:</p>
              <div className="flex flex-wrap gap-1">
                {server.cached_tools && server.cached_tools.length > 0 ? (
                  server.cached_tools.map((t: any) => (
                    <span key={t.name} className="px-1.5 py-0.5 rounded text-xs bg-primary/5 text-primary border border-primary/10">
                      {t.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">暂无缓存工具 (请点击闪电图标连接)</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {servers.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">暂无集成的第三方服务</p>
        </div>
      )}

      {showAddDialog && (
        <McpConfigDialog
          editingServer={editingServer}
          onClose={() => setShowAddDialog(false)}
          onSave={() => {
            setShowAddDialog(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

function McpConfigDialog({ editingServer, onClose, onSave }: { editingServer: McpServerConfig | null, onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState<McpServerCreate>({
    name: editingServer?.name || '',
    description: editingServer?.description || '',
    type: editingServer?.type || 'stdio',
    command: editingServer?.command || '',
    args: editingServer?.args || [],
    env: editingServer?.env || {},
    url: editingServer?.url || '',
    is_enabled: editingServer?.is_enabled ?? true
  })
  
  const [argInput, setArgInput] = useState('')
  const [envKey, setEnvKey] = useState('')
  const [envVal, setEnvVal] = useState('')
  const [saving, setSaving] = useState(false)

  const applyTemplate = (templateName: string) => {
    const template = MCP_TEMPLATES.find(t => t.name === templateName)
    if (template) {
      setForm({
        ...form,
        name: template.name,
        description: template.description,
        type: template.type,
        command: template.command || '',
        args: [...(template.args || [])],
        env: { ...(template.env || {}) } as Record<string, string>,
        url: ''
      })
    }
  }

  const handleSave = async () => {
    if (!form.name) return toast.error('请输入服务名称')
    if (form.type === 'stdio' && !form.command) return toast.error('请输入执行命令')
    if (form.type === 'sse' && !form.url) return toast.error('请输入SSE URL')
    
    setSaving(true)
    try {
      if (editingServer) {
        await mcpApi.update(editingServer.id, form)
      } else {
        await mcpApi.create(form)
      }
      toast.success('保存成功')
      onSave()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{editingServer ? '编辑服务' : '添加服务'}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {!editingServer && (
            <div>
              <label className="block text-sm font-medium mb-2">快速模板</label>
              <div className="flex flex-wrap gap-2">
                {MCP_TEMPLATES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => applyTemplate(t.name)}
                    className="px-3 py-1.5 text-xs bg-muted hover:bg-primary/10 hover:text-primary rounded-full border transition-colors"
                  >
                    + {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">名称</label>
              <input 
                className="w-full px-3 py-2 rounded-lg border bg-background"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="例如: brave-search"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">类型</label>
              <select 
                className="w-full px-3 py-2 rounded-lg border bg-background"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              >
                <option value="stdio">Local Process (stdio)</option>
                <option value="sse">Remote Server (SSE)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <input 
              className="w-full px-3 py-2 rounded-lg border bg-background"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="简要描述该服务的功能"
            />
          </div>
          
          {form.type === 'stdio' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">命令 (Command)</label>
                <input 
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  value={form.command}
                  onChange={e => setForm({...form, command: e.target.value})}
                  placeholder="e.g. npx, python, uv"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">参数 (Args)</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    className="flex-1 px-3 py-2 rounded-lg border bg-background font-mono"
                    value={argInput}
                    onChange={e => setArgInput(e.target.value)}
                    placeholder="-y @modelcontextprotocol/server-brave-search"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (argInput) {
                          setForm({...form, args: [...(form.args || []), argInput]})
                          setArgInput('')
                        }
                      }
                    }}
                  />
                  <button 
                    className="px-3 py-2 border rounded-lg"
                    onClick={() => {
                      if (argInput) {
                        setForm({...form, args: [...(form.args || []), argInput]})
                        setArgInput('')
                      }
                    }}
                  >
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.args?.map((arg, i) => (
                    <span key={i} className="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1 font-mono">
                      {arg}
                      <button onClick={() => setForm({...form, args: form.args?.filter((_, idx) => idx !== i)})}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">环境变量 (Environment Variables)</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    className="flex-1 px-3 py-2 rounded-lg border bg-background font-mono"
                    placeholder="KEY"
                    value={envKey}
                    onChange={e => setEnvKey(e.target.value)}
                  />
                  <input 
                    className="flex-1 px-3 py-2 rounded-lg border bg-background font-mono"
                    placeholder="VALUE"
                    value={envVal}
                    onChange={e => setEnvVal(e.target.value)}
                  />
                  <button 
                    className="px-3 py-2 border rounded-lg"
                    onClick={() => {
                      if (envKey && envVal) {
                        setForm({...form, env: {...form.env, [envKey]: envVal}})
                        setEnvKey('')
                        setEnvVal('')
                      }
                    }}
                  >
                    添加
                  </button>
                </div>
                <div className="space-y-1">
                  {Object.entries(form.env || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between px-3 py-1 bg-muted rounded text-sm font-mono">
                      <span>{k}={v.slice(0, 4)}***</span>
                      <button onClick={() => {
                        const newEnv = {...form.env}
                        delete newEnv[k]
                        setForm({...form, env: newEnv})
                      }}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">SSE URL</label>
              <input 
                className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                value={form.url}
                onChange={e => setForm({...form, url: e.target.value})}
                placeholder="http://localhost:3001/sse"
              />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={form.is_enabled}
              onChange={e => setForm({...form, is_enabled: e.target.checked})}
              className="rounded border-border"
            />
            <label className="text-sm">启用此服务</label>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-muted">取消</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  )
}
