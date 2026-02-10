import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaseList } from './CaseList';
import { CaseDetail } from './CaseDetail';
import { CreateCaseModal } from './CreateCaseModal';
import { Plus, Loader2, Briefcase, Wrench, Calculator, Calendar, Percent, Building2, PieChart, Save, ChevronRight } from 'lucide-react';
import { casesApi, Case as ApiCase, documentsApi, assetsApi, Asset } from '@/lib/api';
import { toast } from 'sonner';
import TaxAssets from '@/pages/TaxAssets';

// 扩展 API Case 接口以适应前端显示需求
export interface Case extends ApiCase {
  client: string; // 派生字段
  lawyer: string; // 派生字段
  progress: number; // 派生字段
  caseNumber: string; // 映射 case_number
  type: string; // 映射 case_type
  createdAt: string; // 映射 created_at
  updatedAt: string; // 映射 updated_at
}

// ========== 内联法务工具组件 ==========

// 统一主题色 — 使用 primary (蓝色) 系色板
const THEME = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  primaryLight: 'bg-blue-50 text-blue-700 border-blue-100',
  primaryBorder: 'border-blue-200',
  accent: 'text-blue-600',
  accentBg: 'bg-blue-50',
  inputFocus: 'focus:ring-2 focus:ring-blue-500 focus:outline-none',
};

// Helper to save calculation result
const saveCalculation = async (title: string, content: string) => {
  try {
    await documentsApi.createText({
      name: `${title}_${new Date().toISOString().split('T')[0]}.md`,
      content,
      doc_type: 'other',
      description: '法务工具计算结果',
      tags: ['工具', '计算'],
    });
    toast.success('计算结果已保存至文档中心');
  } catch {
    toast.error('保存失败');
  }
};

function LitigationCostCalculator() {
  const [amount, setAmount] = useState('');
  const [caseType, setCaseType] = useState('property');
  const [result, setResult] = useState<{ fee: number; reduced?: number } | null>(null);

  const calculate = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) { toast.error('请输入有效金额'); return; }
    let fee = 0;
    if (val <= 10000) fee = 50;
    else if (val <= 100000) fee = 50 + (val - 10000) * 0.025;
    else if (val <= 200000) fee = 2300 + (val - 100000) * 0.02;
    else if (val <= 500000) fee = 4300 + (val - 200000) * 0.015;
    else if (val <= 1000000) fee = 8800 + (val - 500000) * 0.01;
    else if (val <= 2000000) fee = 13800 + (val - 1000000) * 0.009;
    else if (val <= 5000000) fee = 22800 + (val - 2000000) * 0.008;
    else if (val <= 10000000) fee = 46800 + (val - 5000000) * 0.007;
    else if (val <= 20000000) fee = 81800 + (val - 10000000) * 0.006;
    else fee = 141800 + (val - 20000000) * 0.005;
    setResult({ fee: Math.round(fee), reduced: Math.round(fee / 2) });
    toast.success('计算完成');
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation('诉讼费计算', `# 诉讼费计算结果\n- 标的金额: ¥${parseFloat(amount).toLocaleString()}\n- 受理费(全额): ¥${result.fee.toLocaleString()}\n- 受理费(减半): ¥${result.reduced?.toLocaleString()}\n- 时间: ${new Date().toLocaleString()}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">案件类型</label>
        <select value={caseType} onChange={(e) => setCaseType(e.target.value)} className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`}>
          <option value="property">财产案件</option>
          <option value="divorce">离婚案件</option>
          <option value="labor">劳动争议</option>
          <option value="ip">知识产权</option>
        </select>
      </div>
      {caseType === 'property' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">标的金额 (元)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="请输入诉讼标的金额" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`} />
        </div>
      )}
      <button onClick={calculate} className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${THEME.primary}`}>开始计算</button>
      {result && (
        <div className={`p-4 rounded-xl border ${THEME.primaryLight}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-600 text-sm">受理费 (全额)</span>
            <span className="text-lg font-bold text-blue-700">¥ {result.fee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center border-t border-blue-200 pt-2">
            <span className="text-slate-600 text-sm">受理费 (减半/简易)</span>
            <span className="font-semibold text-blue-600">¥ {result.reduced?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-blue-400">* 依据《诉讼费用交纳办法》估算</p>
            <button onClick={handleSave} className="text-xs text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center gap-1"><Save className="w-3 h-3" />保存</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateCalculator() {
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState('');
  const [resultDate, setResultDate] = useState<string | null>(null);

  const calculate = () => {
    if (!startDate || !days) { toast.error('请填写完整信息'); return; }
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(days));
    setResultDate(end.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  };

  const handleSave = () => {
    if (!resultDate) return;
    saveCalculation('期限计算', `# 期限计算结果\n- 开始日期: ${startDate}\n- 天数: ${days}\n- 结果: ${resultDate}\n- 时间: ${new Date().toLocaleString()}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">加/减天数 (负数向前推算)</label>
        <input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="例如: 15 (上诉期)" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`} />
      </div>
      <button onClick={calculate} className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${THEME.primary}`}>计算日期</button>
      {resultDate && (
        <div className={`p-4 rounded-xl border text-center ${THEME.primaryLight}`}>
          <p className="text-xs text-slate-500 mb-1">计算结果</p>
          <p className="text-lg font-bold text-blue-700">{resultDate}</p>
          <button onClick={handleSave} className="mt-2 text-xs text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center gap-1 mx-auto"><Save className="w-3 h-3" />保存</button>
        </div>
      )}
    </div>
  );
}

function InterestCalculator() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [rateType, setRateType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interest, setInterest] = useState<string | null>(null);
  const [daysCount, setDaysCount] = useState(0);

  const calculate = () => {
    if (!principal || !rate || !startDate || !endDate) { toast.error('请填写完整信息'); return; }
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (end <= start) { toast.error('结束日期必须晚于开始日期'); return; }
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    setDaysCount(diffDays);
    const dailyRate = rateType === 'annual' ? (r / 100) / 365 : (r / 10000);
    const res = p * dailyRate * diffDays;
    setInterest(res.toFixed(2));
    toast.success(`计算完成，共 ${diffDays} 天`);
  };

  const handleSave = () => {
    if (!interest) return;
    saveCalculation('利息计算', `# 利息计算结果\n- 本金: ¥${parseFloat(principal).toLocaleString()}\n- 利率: ${rate}${rateType === 'annual' ? '%' : '‱'}\n- 期间: ${startDate} 至 ${endDate} (${daysCount}天)\n- 利息: ¥${parseFloat(interest).toLocaleString()}\n- 时间: ${new Date().toLocaleString()}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">本金 (元)</label>
        <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="10000.00" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">利率</label>
          <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={rateType === 'annual' ? '3.85 (%)' : '5 (万分之)'} className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">类型</label>
          <select value={rateType} onChange={(e) => setRateType(e.target.value)} className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`}>
            <option value="annual">年利率 (%)</option>
            <option value="daily">日利率 (万分之)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">起息日</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">止息日</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm ${THEME.inputFocus}`} />
        </div>
      </div>
      <button onClick={calculate} className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${THEME.primary}`}>计算利息</button>
      {interest && (
        <div className={`p-4 rounded-xl border text-center ${THEME.primaryLight}`}>
          <p className="text-xs text-slate-500 mb-1">应付利息 (共 {daysCount} 天)</p>
          <p className="text-lg font-bold text-blue-700">¥ {parseFloat(interest).toLocaleString()}</p>
          <button onClick={handleSave} className="mt-2 text-xs text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center gap-1 mx-auto"><Save className="w-3 h-3" />保存</button>
        </div>
      )}
    </div>
  );
}

// ========== 法务工具箱面板 ==========
function LegalToolsPanel() {
  const [activeTool, setActiveTool] = useState<string>('litigation');

  const tools = [
    { id: 'litigation', label: '诉讼费计算', icon: Calculator, desc: '根据标的金额计算受理费' },
    { id: 'date', label: '期限计算', icon: Calendar, desc: '计算法律期限截止日期' },
    { id: 'interest', label: '利息计算', icon: Percent, desc: '计算逾期利息/违约金' },
    { id: 'tax', label: '资产与税务', icon: Building2, desc: '资产登记、税费测算、清算模拟' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Tool Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">法务工具箱</h2>
        </div>
        {/* Tool Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tool.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            {activeTool === 'litigation' && <LitigationCostCalculator />}
            {activeTool === 'date' && <DateCalculator />}
            {activeTool === 'interest' && <InterestCalculator />}
            {activeTool === 'tax' && (
              <div className="h-full -m-5">
                <TaxAssets embedded={true} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 主组件 ==========

export function CaseManagement() {
  const [activeView, setActiveView] = useState<'cases' | 'tools'>('cases');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载案件列表
  const loadCases = async () => {
    setIsLoading(true);
    try {
      const response = await casesApi.list({ page_size: 100 });
      // 转换数据格式
      const mappedCases: Case[] = response.items.map(item => ({
        ...item,
        client: item.parties?.client || '未知客户',
        lawyer: item.assignee_id ? '当前律师' : '未分配',
        progress: item.status === 'closed' ? 100 : (item.status === 'in-progress' ? 50 : 0),
        caseNumber: item.case_number || '待生成',
        type: item.case_type,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        deadline: item.deadline,
      }));
      setCases(mappedCases);
    } catch (error) {
      console.error('加载案件失败:', error);
      toast.error('加载案件列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleCreateCase = async (newCaseData: any) => {
    try {
      await casesApi.create({
        title: newCaseData.title,
        case_type: newCaseData.type,
        description: newCaseData.description,
        priority: newCaseData.priority,
        parties: { client: newCaseData.client },
        deadline: newCaseData.deadline,
      });
      toast.success('案件创建成功');
      setShowCreateModal(false);
      loadCases();
    } catch (error) {
      console.error('创建案件失败:', error);
      toast.error('创建案件失败');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* View Switcher */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-1">
        <button
          onClick={() => { setActiveView('cases'); setSelectedCase(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'cases'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          案件列表
        </button>
        <button
          onClick={() => { setActiveView('tools'); setSelectedCase(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'tools'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          法务工具
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'cases' ? (
          <div className="h-full flex">
            {/* Case List */}
            <div className={`${selectedCase ? 'w-1/3' : 'w-full'} transition-all duration-300 h-full flex flex-col`}>
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <CaseList
                  cases={cases}
                  selectedCase={selectedCase}
                  onSelectCase={setSelectedCase}
                  onCreateCase={() => setShowCreateModal(true)}
                />
              )}
            </div>

            {/* Case Detail */}
            <AnimatePresence>
              {selectedCase && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-2/3 border-l border-slate-200 h-full bg-white shadow-xl z-10"
                >
                  <CaseDetail case={selectedCase} onClose={() => setSelectedCase(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <LegalToolsPanel />
        )}
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCase}
        />
      )}
    </div>
  );
}
