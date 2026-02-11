import { useState } from 'react';
import { Calculator, Calendar, Percent, RefreshCw, ChevronRight, Building2, Search, FileCheck, Save } from 'lucide-react';
import { toast } from 'sonner';
import TaxAssets from './TaxAssets';
import { DueDiligence } from '@/components/due-diligence/DueDiligence';
import ContractReview from './ContractReview';
import { documentsApi } from '@/lib/api';

export default function LegalTools() {
  const [activeTab, setActiveTab] = useState<'litigation' | 'date' | 'interest' | 'tax' | 'duediligence' | 'contractreview'>('litigation');

  const tabs = [
    { id: 'litigation', label: '诉讼费计算', icon: Calculator },
    { id: 'date', label: '期限计算', icon: Calendar },
    { id: 'interest', label: '利息计算', icon: Percent },
    { id: 'tax', label: '税务资产', icon: Building2 },
    { id: 'duediligence', label: '尽职调查', icon: Search },
    { id: 'contractreview', label: '合同审查', icon: FileCheck },
  ];

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">法务工具箱</h1>
        <p className="text-sm text-muted-foreground mt-1">提供常用的法律计算工具、税务分析及尽职调查服务</p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-card border-r border-border p-4 space-y-2 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
                {tab.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-primary/60" />}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          {activeTab === 'litigation' && <div className="p-6 max-w-3xl mx-auto"><LitigationCostCalculator /></div>}
          {activeTab === 'date' && <div className="p-6 max-w-3xl mx-auto"><DateCalculator /></div>}
          {activeTab === 'interest' && <div className="p-6 max-w-3xl mx-auto"><InterestCalculator /></div>}
          
          {activeTab === 'tax' && (
            <div className="h-full">
              <TaxAssets embedded={true} />
            </div>
          )}
          
          {activeTab === 'duediligence' && (
             <div className="h-full">
               <DueDiligence />
             </div>
          )}

          {activeTab === 'contractreview' && (
            <div className="h-full">
              <ContractReview embedded={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to save calculation result
const saveCalculation = async (title: string, content: string) => {
    try {
        await documentsApi.createText({
            name: `${title}_${new Date().toISOString().split('T')[0]}.md`,
            content: content,
            doc_type: 'other',
            description: '法务工具计算结果',
            tags: ['工具', '计算']
        });
        toast.success('计算结果已保存至文档中心');
    } catch (error) {
        toast.error('保存失败');
    }
};

// 1. 诉讼费计算器
function LitigationCostCalculator() {
  const [amount, setAmount] = useState<string>('');
  const [caseType, setCaseType] = useState('property'); // property, divorce, labor
  const [result, setResult] = useState<{ fee: number; reduced?: number } | null>(null);

  const calculate = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) {
      toast.error('请输入有效金额');
      return;
    }

    let fee = 0;
    // 简易版《诉讼费用交纳办法》财产案件标准
    if (val <= 10000) {
      fee = 50;
    } else if (val <= 100000) {
      fee = 50 + (val - 10000) * 0.025;
    } else if (val <= 200000) {
      fee = 2300 + (val - 100000) * 0.02;
    } else if (val <= 500000) {
      fee = 4300 + (val - 200000) * 0.015;
    } else if (val <= 1000000) {
      fee = 8800 + (val - 500000) * 0.01;
    } else if (val <= 2000000) {
      fee = 13800 + (val - 1000000) * 0.009;
    } else if (val <= 5000000) {
      fee = 22800 + (val - 2000000) * 0.008;
    } else if (val <= 10000000) {
      fee = 46800 + (val - 5000000) * 0.007;
    } else if (val <= 20000000) {
      fee = 81800 + (val - 10000000) * 0.006;
    } else {
      fee = 141800 + (val - 20000000) * 0.005;
    }

    // 简易程序减半
    setResult({
      fee: Math.round(fee),
      reduced: Math.round(fee / 2),
    });
    toast.success('计算完成');
  };

  const handleSave = () => {
      if (!result) return;
      const content = `# 诉讼费计算结果
      
- **标的金额**: ¥${parseFloat(amount).toLocaleString()}
- **案件类型**: ${caseType === 'property' ? '财产案件' : caseType}
- **受理费 (全额)**: ¥${result.fee.toLocaleString()}
- **受理费 (减半)**: ¥${result.reduced?.toLocaleString()}
- **计算时间**: ${new Date().toLocaleString()}
      `;
      saveCalculation('诉讼费计算', content);
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            诉讼费用计算器
        </h2>
        {result && (
            <button onClick={handleSave} className="text-sm text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Save className="w-4 h-4" /> 保存
            </button>
        )}
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">案件类型</label>
          <select 
            value={caseType}
            onChange={(e) => setCaseType(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="property">财产案件</option>
            <option value="divorce">离婚案件</option>
            <option value="labor">劳动争议</option>
            <option value="ip">知识产权</option>
          </select>
        </div>

        {caseType === 'property' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">标的金额 (元)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="请输入诉讼标的金额"
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <button
          onClick={calculate}
          className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          开始计算
        </button>

        {result && (
          <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">受理费 (全额)</span>
              <span className="text-xl font-bold text-primary">¥ {result.fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-2">
              <span className="text-muted-foreground">受理费 (减半/简易)</span>
              <span className="text-lg font-semibold text-primary">¥ {result.reduced?.toLocaleString()}</span>
            </div>
            <p className="text-xs text-primary/60 mt-2">* 依据《诉讼费用交纳办法》估算，仅供参考，具体以法院核算为准。</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 2. 日期计算器
function DateCalculator() {
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState('');
  const [resultDate, setResultDate] = useState<string | null>(null);

  const calculate = () => {
    if (!startDate || !days) {
      toast.error('请填写完整信息');
      return;
    }
    
    const start = new Date(startDate);
    const addDays = parseInt(days);
    
    const end = new Date(start);
    end.setDate(start.getDate() + addDays);
    
    setResultDate(end.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  };

  const handleSave = () => {
      if (!resultDate) return;
      const content = `# 期限计算结果
      
- **开始日期**: ${startDate}
- **加/减天数**: ${days} 天
- **计算结果**: ${resultDate}
- **计算时间**: ${new Date().toLocaleString()}
      `;
      saveCalculation('期限计算', content);
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            期限/日期计算器
        </h2>
        {resultDate && (
            <button onClick={handleSave} className="text-sm text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Save className="w-4 h-4" /> 保存
            </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">加/减天数 (负数向前推算)</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="例如: 15 (上诉期) 或 30 (举证期)"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={calculate}
          className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          计算日期
        </button>

        {resultDate && (
          <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">计算结果</p>
            <p className="text-xl font-bold text-primary">{resultDate}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 3. 利息计算器
function InterestCalculator() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState(''); // Annual %
  const [rateType, setRateType] = useState('annual'); // annual, daily
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interest, setInterest] = useState<string | null>(null);
  const [daysCount, setDaysCount] = useState(0);

  const calculate = () => {
    if (!principal || !rate || !startDate || !endDate) {
      toast.error('请填写完整信息');
      return;
    }

    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (end <= start) {
      toast.error('结束日期必须晚于开始日期');
      return;
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    setDaysCount(diffDays);
    
    let dailyRate = 0;
    if (rateType === 'annual') {
      dailyRate = (r / 100) / 365;
    } else {
      dailyRate = (r / 10000); // 万分之几
    }

    const res = p * dailyRate * diffDays;
    setInterest(res.toFixed(2));
    toast.success(`计算完成，共 ${diffDays} 天`);
  };

  const handleSave = () => {
      if (!interest) return;
      const content = `# 利息计算结果
      
- **本金**: ¥${parseFloat(principal).toLocaleString()}
- **利率**: ${rate}${rateType === 'annual' ? '%' : '‱'} (${rateType === 'annual' ? '年利率' : '日利率'})
- **起止日期**: ${startDate} 至 ${endDate} (共 ${daysCount} 天)
- **应付利息**: ¥${parseFloat(interest).toLocaleString()}
- **计算时间**: ${new Date().toLocaleString()}
      `;
      saveCalculation('利息计算', content);
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            利息/违约金计算器
        </h2>
        {interest && (
            <button onClick={handleSave} className="text-sm text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Save className="w-4 h-4" /> 保存
            </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">本金 (元)</label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="10000.00"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">利率</label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={rateType === 'annual' ? "3.85 (%)" : "5 (万分之)"}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">类型</label>
            <select
              value={rateType}
              onChange={(e) => setRateType(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="annual">年利率 (%)</option>
              <option value="daily">日利率 (万分之)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">起息日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">止息日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          计算利息
        </button>

        {interest && (
          <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">应付利息</p>
            <p className="text-xl font-bold text-primary">¥ {parseFloat(interest).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
