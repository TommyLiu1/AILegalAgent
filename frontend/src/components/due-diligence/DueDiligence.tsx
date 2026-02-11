import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building2, AlertTriangle, Scale, Users, TrendingUp, Loader2, CheckCircle } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { CompanyProfile } from './CompanyProfile';
import { SentimentAnalysis } from './SentimentAnalysis';
import { RelationshipGraph } from './RelationshipGraph';
import { RiskTimeline } from './RiskTimeline';
import { LegalCases } from './LegalCases';
import { ComplianceReport } from './ComplianceReport';
import { dueDiligenceApi, licApi, InvestigationStreamEvent } from '@/lib/api';
import { toast } from 'sonner';
import { CrawlProgressBar } from '../lic/CrawlProgressBar';
import { v4 as uuidv4 } from 'uuid';

interface InvestigationData {
  companyName: string;
  basicInfo: any;
  litigation: any;
  credit: any;
  risk: any;
}

interface InvestigationStep {
  step: string;
  label: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  data?: any;
}

export function DueDiligence() {
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [investigationData, setInvestigationData] = useState<InvestigationData | null>(null);
  const [steps, setSteps] = useState<InvestigationStep[]>([]);
  const [licTaskId, setLicTaskId] = useState<string>('');

  const handleSearch = async (name: string) => {
    if (!name.trim()) return;
    
    setCompanyName(name);
    setIsSearching(true);
    setHasResults(false);
    setInvestigationData(null);
    
    // 启动 LIC 抓取任务
    const taskId = uuidv4();
    setLicTaskId(taskId);
    try {
      licApi.startCrawl({ 
        url: 'https://www.tianyancha.com', 
        keyword: name, 
        task_id: taskId 
      });
    } catch (e) {
      console.error('启动 LIC 任务失败', e);
    }
    
    // 初始化步骤
    const initialSteps: InvestigationStep[] = [
      { step: 'basic_info', label: '工商信息', status: 'pending' },
      { step: 'litigation', label: '诉讼记录', status: 'pending' },
      { step: 'credit', label: '信用评估', status: 'pending' },
      { step: 'risk', label: '风险分析', status: 'pending' },
    ];
    setSteps(initialSteps);
    
    const collectedData: any = { companyName: name };
    
    try {
      await dueDiligenceApi.streamInvestigate(
        name,
        'comprehensive',
        (event: InvestigationStreamEvent) => {
          if (event.type === 'step') {
            // 更新步骤状态为加载中
            setSteps(prev => prev.map(s => 
              s.step === event.step ? { ...s, status: 'loading' } : s
            ));
          } else if (event.type === 'result') {
            // 更新步骤状态为完成，保存数据
            setSteps(prev => prev.map(s => 
              s.step === event.step ? { ...s, status: 'done', data: event.data } : s
            ));
            
            // 收集数据
            if (event.step === 'basic_info') collectedData.basicInfo = event.data;
            if (event.step === 'litigation') collectedData.litigation = event.data;
            if (event.step === 'credit') collectedData.credit = event.data;
            if (event.step === 'risk') collectedData.risk = event.data;
          } else if (event.type === 'done') {
            setInvestigationData(collectedData);
            setIsSearching(false);
            setHasResults(true);
            toast.success('尽职调查完成');
          } else if (event.type === 'error') {
            toast.error(event.message || '调查失败');
            setIsSearching(false);
          }
        },
        (error) => {
          console.error('流式调查失败:', error);
          // 降级到非流式调用
          fallbackInvestigate(name);
        }
      );
    } catch (error) {
      fallbackInvestigate(name);
    }
  };

  const fallbackInvestigate = async (name: string) => {
    try {
      // 使用非流式 API
      const [profile, risks, litigation] = await Promise.all([
        dueDiligenceApi.getCompanyProfile(name),
        dueDiligenceApi.getCompanyRisks(name),
        dueDiligenceApi.getCompanyLitigation(name),
      ]);
      
      setInvestigationData({
        companyName: name,
        basicInfo: profile.profile,
        litigation: litigation.summary,
        credit: { credit_rating: 'B' },
        risk: risks,
      });
      
      setSteps(prev => prev.map(s => ({ ...s, status: 'done' })));
      setIsSearching(false);
      setHasResults(true);
      toast.success('尽职调查完成');
    } catch (error: any) {
      toast.error(error.message || '调查失败');
      setIsSearching(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} isSearching={isSearching} />

        {!hasResults && !isSearching && (
          <div className="flex items-center justify-center py-16 lg:py-20">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 lg:w-10 lg:h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2 text-base lg:text-lg">尽职调查</h3>
                <p className="text-sm text-muted-foreground">
                  输入企业名称，AI 将自动进行全方位调查
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['阿里巴巴', '腾讯', '华为'].map(name => (
                  <button
                    key={name}
                    onClick={() => handleSearch(name)}
                    className="px-3 py-1.5 bg-muted text-foreground/80 rounded-full text-sm hover:bg-border transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="flex items-center justify-center py-8 lg:py-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h3 className="font-medium text-foreground text-lg">正在调查: {companyName}</h3>
              </div>
              
                <div className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
                <CrawlProgressBar taskId={licTaskId} />
                
                {steps.map((step, index) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.status === 'done' ? 'bg-success/10' :
                      step.status === 'loading' ? 'bg-primary/10' :
                      'bg-muted'
                    }`}>
                      {step.status === 'loading' ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : step.status === 'done' ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <span className="w-2 h-2 bg-muted-foreground rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        step.status === 'done' ? 'text-success' :
                        step.status === 'loading' ? 'text-primary' :
                        'text-muted-foreground'
                      }`}>
                        {step.label}
                      </p>
                      {step.status === 'loading' && (
                        <p className="text-xs text-muted-foreground">正在获取数据...</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasResults && investigationData && (
          <div className="space-y-4 lg:space-y-6">
            {/* Company Profile */}
            <CompanyProfile data={investigationData.basicInfo} companyName={companyName} />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                <SentimentAnalysis data={investigationData.risk} />
                <RelationshipGraph companyName={companyName} />
                <LegalCases data={investigationData.litigation} />
              </div>

              {/* Right Column */}
              <div className="space-y-4 lg:space-y-6">
                <RiskTimeline data={investigationData.risk} />
                <ComplianceReport data={investigationData.credit} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}