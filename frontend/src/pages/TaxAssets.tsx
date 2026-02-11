import { useState, useEffect } from 'react';
import { Building2, Calculator, PieChart, Plus, Trash2, FileText, DollarSign, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { documentsApi, assetsApi, Asset } from '@/lib/api';

// 类型定义
// Asset imported from api
// interface Asset { ... }

interface TaxResult {
  vat: number; // 增值税
  cit: number; // 企业所得税
  landTax: number; // 土地增值税
  stampDuty: number; // 印花税
  total: number;
}

export default function TaxAssets({ embedded = false }: { embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<'register' | 'tax' | 'liquidation'>('register');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
        setLoading(true);
        const data = await assetsApi.list();
        setAssets(data);
    } catch (error) {
        console.error('Failed to load assets:', error);
        toast.error('加载资产列表失败');
    } finally {
        setLoading(false);
    }
  };

  const addAsset = async () => {
    const newAssetData = {
      name: '新资产',
      type: 'real_estate',
      originalValue: 0,
      currentValue: 0,
      acquisitionDate: new Date().toISOString().split('T')[0],
    };
    
    try {
        const createdAsset = await assetsApi.create(newAssetData);
        setAssets([...assets, createdAsset]);
        toast.success('资产添加成功');
    } catch (error) {
        toast.error('添加资产失败');
    }
  };

  const updateAsset = async (id: string, field: keyof Asset, value: any) => {
    // Optimistic update
    const oldAssets = [...assets];
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: value } : a));
    
    // Debounce could be applied here in a real app, 
    // but for simplicity we'll just fire the request (or maybe use onBlur in inputs)
    // For inputs like text/number, it's better to update local state immediately 
    // and trigger API on blur/change complete. 
    // However, keeping it simple: trigger API for now. 
    
    // Actually, triggering API on every keystroke is bad. 
    // Let's rely on the AssetRegister component to handle local edits and call onUpdate onBlur/Change.
    // The current implementation of AssetRegister calls onUpdate onChange.
    // We should probably change AssetRegister to have local state or use onBlur.
    
    // For now, let's keep the parent state update immediate for UI responsiveness, 
    // but we need to call API. 
    
    // Ideally we update the specific field.
    try {
        await assetsApi.update(id, { [field]: value });
    } catch (error) {
        console.error('Update failed', error);
        // toast.error('更新失败'); // Too noisy for every keystroke if failed
        // Revert on failure?
    }
  };

  const removeAsset = async (id: string) => {
    try {
        await assetsApi.delete(id);
        setAssets(assets.filter(a => a.id !== id));
        toast.success('资产删除成功');
    } catch (error) {
        toast.error('删除资产失败');
    }
  };

  const generateReport = async () => {
    const content = `# 资产与税务分析报告
    
## 1. 资产清单
${assets.map(a => `- **${a.name}** (${a.type}): 现值 ¥${a.currentValue.toLocaleString()} (原值 ¥${a.originalValue.toLocaleString()})`).join('\n')}

## 2. 资产总值
¥${assets.reduce((sum, a) => sum + Number(a.currentValue), 0).toLocaleString()}

## 3. 生成时间
${new Date().toLocaleString()}
    `;

    try {
        await documentsApi.createText({
            name: `资产分析报告_${new Date().toISOString().split('T')[0]}.md`,
            content: content,
            doc_type: 'report',
            tags: ['资产', '税务']
        });
        toast.success('报告已生成并保存至文档中心');
    } catch (error) {
        toast.error('保存报告失败');
    }
  };

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header - Hidden if embedded */}
      {!embedded && (
        <div className="bg-card border-b border-border px-6 py-4 flex justify-between items-center">
          <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">税务与资产分析</h1>
              <p className="text-sm text-muted-foreground mt-1">企业资产管理、交易税费测算与清算模拟</p>
          </div>
          <button 
              onClick={generateReport}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
              <Save className="w-4 h-4" />
              保存报告
          </button>
        </div>
      )}

      {/* Toolbar for embedded mode */}
      {embedded && (
         <div className="bg-card border-b border-border px-4 py-2 flex justify-end">
            <button 
                onClick={generateReport}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border text-foreground hover:bg-muted rounded-md transition-colors text-xs font-medium shadow-sm"
            >
                <Save className="w-3.5 h-3.5" />
                保存分析报告
            </button>
         </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-48 bg-card border-r border-border p-2 md:p-4 space-y-1 md:space-y-2 shrink-0">
          <button
            onClick={() => setActiveTab('register')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'register' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Building2 className="w-5 h-5" />
            资产登记
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'tax' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Calculator className="w-5 h-5" />
            税费测算
          </button>
          <button
            onClick={() => setActiveTab('liquidation')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'liquidation' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <PieChart className="w-5 h-5" />
            清算模拟
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'register' && (
                            <AssetRegister assets={assets} onAdd={addAsset} onUpdate={updateAsset} onRemove={removeAsset} />
                        )}
                        {activeTab === 'tax' && <TaxCalculator assets={assets} />}
                        {activeTab === 'liquidation' && <LiquidationSimulator assets={assets} />}
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

function AssetRegister({ assets, onAdd, onUpdate, onRemove }: { assets: Asset[], onAdd: () => void, onUpdate: (id: string, field: keyof Asset, v: any) => void, onRemove: (id: string) => void }) {
    const typeLabels = {
        real_estate: '房地产',
        equity: '股权',
        vehicle: '车辆',
        ip: '知识产权',
        equipment: '设备'
    };

    // Helper to handle input blur for updates to avoid too many API calls
    const handleBlur = (id: string, field: keyof Asset, value: any) => {
        onUpdate(id, field, value);
    };

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-foreground">资产清单</h2>
                <button onClick={onAdd} className="flex items-center gap-1 text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" /> 添加资产
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-muted-foreground bg-muted border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-medium">资产名称</th>
                            <th className="px-4 py-3 font-medium">类型</th>
                            <th className="px-4 py-3 font-medium">原值 (元)</th>
                            <th className="px-4 py-3 font-medium">现值/评估值 (元)</th>
                            <th className="px-4 py-3 font-medium">购置日期</th>
                            <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {assets.map(asset => (
                            <tr key={asset.id} className="group hover:bg-muted/50">
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        defaultValue={asset.name} 
                                        onBlur={(e) => handleBlur(asset.id, 'name', e.target.value)}
                                        className="w-full bg-transparent focus:outline-none focus:border-b border-primary"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select 
                                        value={asset.type}
                                        onChange={(e) => onUpdate(asset.id, 'type', e.target.value)}
                                        className="bg-transparent focus:outline-none"
                                    >
                                        {Object.entries(typeLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="number" 
                                        defaultValue={asset.originalValue} 
                                        onBlur={(e) => handleBlur(asset.id, 'originalValue', parseFloat(e.target.value))}
                                        className="w-full bg-transparent focus:outline-none text-muted-foreground"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="number" 
                                        defaultValue={asset.currentValue} 
                                        onBlur={(e) => handleBlur(asset.id, 'currentValue', parseFloat(e.target.value))}
                                        className="w-full bg-transparent focus:outline-none font-medium text-foreground"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="date" 
                                        defaultValue={asset.acquisitionDate} 
                                        onBlur={(e) => handleBlur(asset.id, 'acquisitionDate', e.target.value)}
                                        className="bg-transparent focus:outline-none text-muted-foreground"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <button onClick={() => onRemove(asset.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {assets.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground/50">暂无资产，请点击添加</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border flex justify-end gap-6 text-sm">
                <div>
                    <span className="text-muted-foreground">原值总计: </span>
                    <span className="font-medium text-foreground">¥ {assets.reduce((sum, a) => sum + (a.originalValue || 0), 0).toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">现值总计: </span>
                    <span className="font-bold text-primary text-lg">¥ {assets.reduce((sum, a) => sum + (a.currentValue || 0), 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}

function TaxCalculator({ assets }: { assets: Asset[] }) {
    const [selectedAssetId, setSelectedAssetId] = useState<string>('');
    const [result, setResult] = useState<TaxResult | null>(null);

    // Effect to select first asset if available and none selected
    useEffect(() => {
        if (assets.length > 0 && !selectedAssetId) {
            setSelectedAssetId(assets[0].id);
        }
    }, [assets, selectedAssetId]);

    const asset = assets.find(a => a.id === selectedAssetId);

    const calculateTax = () => {
        if (!asset) return;
        
        let vat = 0;
        let cit = 0;
        let landTax = 0;
        let stampDuty = 0;

        const gain = Math.max(0, asset.currentValue - asset.originalValue);

        // 简易模拟算法
        if (asset.type === 'real_estate') {
            vat = (asset.currentValue - asset.originalValue) * 0.05; // 差额征收 5%
            landTax = gain * 0.3; // 土地增值税预估 30%
            stampDuty = asset.currentValue * 0.0005; // 万分之五
            cit = (gain - vat - landTax - stampDuty) * 0.25; // 企业所得税 25%
        } else if (asset.type === 'equity') {
            stampDuty = asset.currentValue * 0.0005;
            cit = gain * 0.25;
        } else {
            vat = asset.currentValue * 0.13; // 全额 13%
            cit = (gain - vat) * 0.25;
        }

        setResult({
            vat,
            cit,
            landTax,
            stampDuty,
            total: vat + cit + landTax + stampDuty
        });
    };

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">交易税费测算</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">选择交易资产</label>
                        <select 
                            value={selectedAssetId}
                            onChange={(e) => { setSelectedAssetId(e.target.value); setResult(null); }}
                            className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring focus:outline-none"
                        >
                            <option value="">请选择...</option>
                            {assets.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                            ))}
                        </select>
                    </div>

                    {asset && (
                        <div className="bg-muted p-4 rounded-xl space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">交易价格:</span>
                                <span className="font-medium">¥ {asset.currentValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">资产原值:</span>
                                <span className="font-medium">¥ {asset.originalValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">增值额:</span>
                                <span className="font-medium text-success">+ ¥ {(asset.currentValue - asset.originalValue).toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={calculateTax}
                        disabled={!asset}
                        className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                    >
                        计算预估税费
                    </button>
                </div>

                <div className="bg-primary/10 rounded-xl p-6 border border-primary/20 flex flex-col justify-center">
                    {result ? (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground border-b border-primary/20 pb-2">测算结果</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">增值税 (VAT)</span>
                                    <span className="font-medium">¥ {result.vat.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">土地增值税 (LAT)</span>
                                    <span className="font-medium">¥ {result.landTax.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">印花税</span>
                                    <span className="font-medium">¥ {result.stampDuty.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">企业所得税 (CIT)</span>
                                    <span className="font-medium">¥ {result.cit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-primary/20 flex justify-between items-center">
                                <span className="font-semibold text-foreground">税费合计</span>
                                <span className="font-bold text-xl text-primary">¥ {result.total.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </div>
                            <p className="text-xs text-primary/60 mt-2">* 仅为模拟测算，未考虑附加税及特殊优惠政策。</p>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground/50">
                            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>请选择资产并点击计算</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LiquidationSimulator({ assets }: { assets: Asset[] }) {
    const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const [debts, setDebts] = useState({
        secured: 20000000,
        wages: 5000000,
        taxes: 3000000,
        common: 80000000
    });

    const totalDebts = Object.values(debts).reduce((a, b) => a + b, 0);
    const solvencyRatio = totalAssets / totalDebts;

    // 清偿逻辑
    let remaining = totalAssets;
    
    const paySecured = Math.min(remaining, debts.secured);
    remaining -= paySecured;
    
    const payWages = Math.min(remaining, debts.wages);
    remaining -= payWages;
    
    const payTaxes = Math.min(remaining, debts.taxes);
    remaining -= payTaxes;
    
    const payCommon = Math.min(remaining, debts.common);
    const commonRatio = debts.common > 0 ? (payCommon / debts.common) : 0;

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">破产清算偿债模拟</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-foreground">资产总额 (来自登记)</label>
                            <span className="font-bold text-primary">¥ {totalAssets.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-full"></div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground">债务录入</h3>
                        <div>
                            <label className="text-xs text-muted-foreground">担保债务 (优先)</label>
                            <input 
                                type="number" 
                                value={debts.secured}
                                onChange={(e) => setDebts({...debts, secured: parseFloat(e.target.value) || 0})}
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground">职工工资/社保</label>
                            <input 
                                type="number" 
                                value={debts.wages}
                                onChange={(e) => setDebts({...debts, wages: parseFloat(e.target.value) || 0})}
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground">欠缴税款</label>
                            <input 
                                type="number" 
                                value={debts.taxes}
                                onChange={(e) => setDebts({...debts, taxes: parseFloat(e.target.value) || 0})}
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground">普通债务</label>
                            <input 
                                type="number" 
                                value={debts.common}
                                onChange={(e) => setDebts({...debts, common: parseFloat(e.target.value) || 0})}
                                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-muted rounded-xl p-6">
                        <h3 className="font-semibold text-foreground mb-4">清偿结果预览</h3>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">1. 担保债务</span>
                                <div className="text-right">
                                    <span className="block font-medium">¥ {paySecured.toLocaleString()}</span>
                                    <span className={`text-xs ${paySecured === debts.secured ? 'text-success' : 'text-destructive'}`}>
                                        {((paySecured/debts.secured || 0)*100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">2. 职工权益</span>
                                <div className="text-right">
                                    <span className="block font-medium">¥ {payWages.toLocaleString()}</span>
                                    <span className={`text-xs ${payWages === debts.wages ? 'text-success' : 'text-destructive'}`}>
                                        {((payWages/debts.wages || 0)*100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">3. 税款</span>
                                <div className="text-right">
                                    <span className="block font-medium">¥ {payTaxes.toLocaleString()}</span>
                                    <span className={`text-xs ${payTaxes === debts.taxes ? 'text-success' : 'text-destructive'}`}>
                                        {((payTaxes/debts.taxes || 0)*100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-border">
                                <span className="text-sm font-semibold text-foreground">4. 普通债权</span>
                                <div className="text-right">
                                    <span className="block font-bold text-lg text-primary">¥ {payCommon.toLocaleString()}</span>
                                    <span className={`text-sm font-bold ${commonRatio === 1 ? 'text-success' : 'text-destructive'}`}>
                                        清偿率: {(commonRatio*100).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-warning-light rounded-lg border border-warning/20 text-warning-foreground text-sm">
                        <FileText className="w-4 h-4 inline-block mr-1 mb-0.5" />
                        普通债权清偿率低于 100% 时，意味着企业资不抵债，普通债权人将面临损失。
                    </div>
                </div>
            </div>
        </div>
    );
}
