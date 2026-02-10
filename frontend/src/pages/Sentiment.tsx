import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  Eye,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  FileText,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { sentimentApi, licApi, type SentimentMonitor, type SentimentRecord, type SentimentAlert } from '@/lib/api';
import { CrawlProgressBar } from '@/components/lic/CrawlProgressBar';
import { v4 as uuidv4 } from 'uuid';

// 情感类型标签
const sentimentLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  positive: { label: '正面', color: 'bg-green-100 text-green-800', icon: <TrendingUp className="h-3 w-3" /> },
  negative: { label: '负面', color: 'bg-red-100 text-red-800', icon: <TrendingDown className="h-3 w-3" /> },
  neutral: { label: '中性', color: 'bg-gray-100 text-gray-800', icon: <Minus className="h-3 w-3" /> },
};

// 风险等级标签
const riskLabels: Record<string, { label: string; color: string }> = {
  low: { label: '低风险', color: 'bg-green-100 text-green-800' },
  medium: { label: '中风险', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高风险', color: 'bg-orange-100 text-orange-800' },
  critical: { label: '极高风险', color: 'bg-red-100 text-red-800' },
};

// 预警等级标签
const alertLabels: Record<string, { label: string; color: string }> = {
  info: { label: '提示', color: 'bg-blue-100 text-blue-800' },
  warning: { label: '警告', color: 'bg-yellow-100 text-yellow-800' },
  danger: { label: '危险', color: 'bg-orange-100 text-orange-800' },
  critical: { label: '紧急', color: 'bg-red-100 text-red-800' },
};

export default function Sentiment() {
  const [activeTab, setActiveTab] = useState('overview');
  const [monitors, setMonitors] = useState<SentimentMonitor[]>([]);
  const [records, setRecords] = useState<SentimentRecord[]>([]);
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 分析表单状态
  const [analyzeContent, setAnalyzeContent] = useState('');
  const [analyzeKeyword, setAnalyzeKeyword] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  
  // 新建监控对话框
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMonitor, setNewMonitor] = useState({
    name: '',
    keywords: '',
    alertThreshold: 0.7,
  });
  const [licTaskId, setLicTaskId] = useState<string>('');

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [monitorsRes, recordsRes, alertsRes, statsRes] = await Promise.all([
        sentimentApi.listMonitors(),
        sentimentApi.listRecords(),
        sentimentApi.listAlerts({ is_read: false }),
        sentimentApi.getStatistics(),
      ]);
      setMonitors(monitorsRes.items);
      setRecords(recordsRes.items);
      setAlerts(alertsRes.items);
      setStatistics(statsRes);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建监控
  const handleCreateMonitor = async () => {
    if (!newMonitor.name || !newMonitor.keywords) {
      toast.error('请填写监控名称和关键词');
      return;
    }
    
    try {
      const keywords = newMonitor.keywords.split(',').map(k => k.trim()).filter(k => k);
      await sentimentApi.createMonitor({
        name: newMonitor.name,
        keywords,
        alert_threshold: newMonitor.alertThreshold,
      });
      toast.success('监控配置创建成功');
      setShowCreateDialog(false);
      setNewMonitor({ name: '', keywords: '', alertThreshold: 0.7 });
      loadData();
    } catch (error) {
      toast.error('创建失败');
    }
  };

  // 分析舆情
  const handleAnalyze = async () => {
    if (!analyzeContent || !analyzeKeyword) {
      toast.error('请输入内容和关键词');
      return;
    }
    
    // 启动 LIC 抓取增强
    const taskId = uuidv4();
    setLicTaskId(taskId);
    licApi.startCrawl({ 
      url: 'https://weibo.com', 
      keyword: analyzeKeyword, 
      task_id: taskId 
    });

    setAnalyzing(true);
    try {
      const result = await sentimentApi.analyze({
        content: analyzeContent,
        keyword: analyzeKeyword,
        save_record: true,
      });
      setAnalyzeResult(result);
      toast.success('分析完成');
      loadData();
    } catch (error) {
      toast.error('分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  // 标记预警已读
  const handleMarkRead = async (alertId: string) => {
    try {
      await sentimentApi.markAlertRead(alertId);
      toast.success('已标记为已读');
      loadData();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 处理预警
  const handleHandleAlert = async (alertId: string) => {
    try {
      await sentimentApi.handleAlert(alertId);
      toast.success('预警已处理');
      loadData();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">舆情监控</h1>
          <p className="text-muted-foreground">实时监控法律舆情动态，智能预警风险</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建监控
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建监控配置</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>监控名称</Label>
                  <Input
                    placeholder="如：公司声誉监控"
                    value={newMonitor.name}
                    onChange={(e) => setNewMonitor({ ...newMonitor, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>关键词（逗号分隔）</Label>
                  <Input
                    placeholder="如：公司名, 法务, 诉讼"
                    value={newMonitor.keywords}
                    onChange={(e) => setNewMonitor({ ...newMonitor, keywords: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>预警阈值：{newMonitor.alertThreshold}</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newMonitor.alertThreshold}
                    onChange={(e) => setNewMonitor({ ...newMonitor, alertThreshold: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                <Button onClick={handleCreateMonitor}>创建</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">舆情总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total_records || 0}</div>
            <p className="text-xs text-muted-foreground">近7天</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">负面舆情</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {statistics?.sentiment_distribution?.negative || 0}
            </div>
            <p className="text-xs text-muted-foreground">需要关注</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高风险</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {(statistics?.risk_distribution?.high || 0) + (statistics?.risk_distribution?.critical || 0)}
            </div>
            <p className="text-xs text-muted-foreground">需要处理</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未读预警</CardTitle>
            <Bell className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {statistics?.alerts?.unread || 0}
            </div>
            <p className="text-xs text-muted-foreground">待处理</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="analyze">舆情分析</TabsTrigger>
          <TabsTrigger value="records">舆情记录</TabsTrigger>
          <TabsTrigger value="alerts">预警中心</TabsTrigger>
          <TabsTrigger value="monitors">监控配置</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 最新舆情 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">最新舆情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {records.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded ${sentimentLabels[record.sentiment_type]?.color || 'bg-gray-100'}`}>
                        {sentimentLabels[record.sentiment_type]?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{record.keyword}</Badge>
                          <Badge className={riskLabels[record.risk_level]?.color}>
                            {riskLabels[record.risk_level]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {record.content.substring(0, 100)}...
                        </p>
                      </div>
                    </div>
                  ))}
                  {records.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">暂无舆情记录</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 最新预警 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">最新预警</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded ${alertLabels[alert.alert_level]?.color || 'bg-gray-100'}`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{alert.title}</span>
                          <Badge className={alertLabels[alert.alert_level]?.color}>
                            {alertLabels[alert.alert_level]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {alert.message.substring(0, 80)}...
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => handleMarkRead(alert.id)}>
                            <Eye className="h-3 w-3 mr-1" />
                            已读
                          </Button>
                          <Button size="sm" onClick={() => handleHandleAlert(alert.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            处理
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">暂无未读预警</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 舆情分析标签页 */}
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>舆情分析</CardTitle>
              <CardDescription>输入文本内容进行情感分析和风险评估</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {licTaskId && <CrawlProgressBar taskId={licTaskId} />}
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Textarea
                    placeholder="请输入要分析的舆情内容..."
                    value={analyzeContent}
                    onChange={(e) => setAnalyzeContent(e.target.value)}
                    rows={6}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>关键词</Label>
                    <Input
                      placeholder="如：合同纠纷"
                      value={analyzeKeyword}
                      onChange={(e) => setAnalyzeKeyword(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        开始分析
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 分析结果 */}
              {analyzeResult && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-medium">分析结果</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">情感类型</p>
                      <Badge className={sentimentLabels[analyzeResult.sentiment_type]?.color}>
                        {sentimentLabels[analyzeResult.sentiment_type]?.label}
                      </Badge>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">情感分数</p>
                      <p className="text-xl font-bold">{analyzeResult.sentiment_score?.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">风险等级</p>
                      <Badge className={riskLabels[analyzeResult.risk_level]?.color}>
                        {riskLabels[analyzeResult.risk_level]?.label}
                      </Badge>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">风险分数</p>
                      <p className="text-xl font-bold">{analyzeResult.risk_score?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 舆情记录标签页 */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>舆情记录</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="搜索关键词..."
                    className="w-64"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="情感类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="positive">正面</SelectItem>
                      <SelectItem value="negative">负面</SelectItem>
                      <SelectItem value="neutral">中性</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {records
                  .filter(r => !searchKeyword || r.keyword.includes(searchKeyword) || r.content.includes(searchKeyword))
                  .map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{record.keyword}</Badge>
                          <Badge className={sentimentLabels[record.sentiment_type]?.color}>
                            {sentimentLabels[record.sentiment_type]?.icon}
                            <span className="ml-1">{sentimentLabels[record.sentiment_type]?.label}</span>
                          </Badge>
                          <Badge className={riskLabels[record.risk_level]?.color}>
                            {riskLabels[record.risk_level]?.label}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(record.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{record.content}</p>
                      {record.summary && (
                        <p className="text-sm text-muted-foreground mt-2">摘要：{record.summary}</p>
                      )}
                    </div>
                  ))}
                {records.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">暂无舆情记录</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 预警中心标签页 */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>预警中心</CardTitle>
                <Select defaultValue="all">
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="预警等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="critical">紧急</SelectItem>
                    <SelectItem value="danger">危险</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="info">提示</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={alertLabels[alert.alert_level]?.color}>
                          {alertLabels[alert.alert_level]?.label}
                        </Badge>
                        <span className="font-medium">{alert.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.is_read ? (
                          <Badge variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            已读
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <BellOff className="h-3 w-3 mr-1" />
                            未读
                          </Badge>
                        )}
                        {alert.is_handled ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            已处理
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            待处理
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                      <div className="flex gap-2">
                        {!alert.is_read && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkRead(alert.id)}>
                            标记已读
                          </Button>
                        )}
                        {!alert.is_handled && (
                          <Button size="sm" onClick={() => handleHandleAlert(alert.id)}>
                            处理预警
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">暂无预警信息</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 监控配置标签页 */}
        <TabsContent value="monitors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>监控配置</CardTitle>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建监控
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monitors.map((monitor) => (
                  <div key={monitor.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{monitor.name}</span>
                        {monitor.is_active ? (
                          <Badge className="bg-green-100 text-green-800">运行中</Badge>
                        ) : (
                          <Badge variant="secondary">已暂停</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">编辑</Button>
                        <Button size="sm" variant="outline">
                          {monitor.is_active ? '暂停' : '启用'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {monitor.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline">{keyword}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>舆情数：{monitor.total_records}</span>
                      <span>负面数：{monitor.negative_count}</span>
                      <span>预警数：{monitor.alert_count}</span>
                      <span>阈值：{monitor.alert_threshold}</span>
                    </div>
                  </div>
                ))}
                {monitors.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">暂无监控配置，点击上方按钮创建</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
