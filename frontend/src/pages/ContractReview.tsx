import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Upload, AlertTriangle, CheckCircle, XCircle, 
  Loader2, FileUp, Sparkles, Shield, AlertCircle, 
  ChevronRight, Download, Copy, RefreshCw
} from 'lucide-react';
import { contractsApi, DocumentParseResult, QuickReviewResult, ContractReviewStreamEvent } from '@/lib/api';
import { toast } from 'sonner';

type ReviewStep = 'upload' | 'parsing' | 'reviewing' | 'complete';

interface RiskItem {
  type: string;
  title: string;
  level: string;
  description: string;
  suggestion: string;
}

export default function ContractReview({ embedded = false }: { embedded?: boolean }) {
  const [step, setStep] = useState<ReviewStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [contractText, setContractText] = useState('');
  const [parseResult, setParseResult] = useState<DocumentParseResult | null>(null);
  const [reviewResult, setReviewResult] = useState<QuickReviewResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('');
  const [agentMessage, setAgentMessage] = useState('');
  const [detectedRisks, setDetectedRisks] = useState<RiskItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);
  
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setStep('parsing');
    setIsProcessing(true);
    setCurrentAgent('文档解析');
    setAgentMessage('正在解析文档内容...');
    
    try {
      const result = await contractsApi.parseDocument(selectedFile);
      
      if (!result.success) {
        toast.error(result.error || '文档解析失败');
        setStep('upload');
        return;
      }
      
      setParseResult(result);
      setContractText(result.text);
      toast.success(`文档解析成功: ${result.contract_type}`);
      
      // 自动开始审查
      await startReview(result.text, result.contract_type);
      
    } catch (error: any) {
      toast.error(error.message || '解析失败');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const startReview = async (text: string, contractType?: string) => {
    setStep('reviewing');
    setIsProcessing(true);
    setDetectedRisks([]);
    
    try {
      // 使用流式审查
      await contractsApi.streamReview(
        { text },
        (event: ContractReviewStreamEvent) => {
          switch (event.type) {
            case 'start':
              setAgentMessage(event.message || '开始处理...');
              break;
            case 'analyzing':
              setCurrentAgent(event.agent || '合同审查Agent');
              setAgentMessage(event.message || '分析中...');
              break;
            case 'reviewing':
              setCurrentAgent(event.agent || '风险评估Agent');
              setAgentMessage(event.message || '识别风险...');
              break;
            case 'risks':
              if (event.data) {
                setDetectedRisks(event.data);
              }
              break;
            case 'done':
              setReviewResult({
                summary: event.summary || '',
                risk_level: event.risk_level || 'medium',
                risk_score: event.risk_score || 0.5,
                key_risks: detectedRisks,
                suggestions: [],
                key_terms: {},
              });
              setStep('complete');
              break;
            case 'error':
              toast.error(event.message || '审查失败');
              break;
          }
        },
        (error) => {
          // 降级到非流式审查
          fallbackReview(text, contractType);
        }
      );
    } catch {
      await fallbackReview(text, contractType);
    }
    
    setIsProcessing(false);
  };
  
  const fallbackReview = async (text: string, contractType?: string) => {
    try {
      setCurrentAgent('合同审查Agent');
      setAgentMessage('正在进行快速审查...');
      
      const result = await contractsApi.quickReview(text, contractType);
      setReviewResult(result);
      setDetectedRisks(result.key_risks);
      setStep('complete');
    } catch (error: any) {
      toast.error(error.message || '审查失败');
      setStep('upload');
    }
  };
  
  const resetReview = () => {
    setStep('upload');
    setFile(null);
    setContractText('');
    setParseResult(null);
    setReviewResult(null);
    setDetectedRisks([]);
  };
  
  const getRiskLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getRiskLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
      case 'high':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-[#F2F2F7]">
      {/* Header */}
      {!embedded && (
      <div className="bg-white border-b border-[#E5E5EA] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1C1C1E]">合同智能审查</h1>
            <p className="text-sm text-[#8E8E93] mt-1">
              上传合同文档，AI 自动识别风险条款并提供修改建议
            </p>
          </div>
          {step !== 'upload' && (
            <button
              onClick={resetReview}
              className="flex items-center gap-2 px-4 py-2 text-[#007AFF] hover:bg-[#F2F2F7] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新审查
            </button>
          )}
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-4 mt-4">
          {['upload', 'parsing', 'reviewing', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                step === s 
                  ? 'bg-[#007AFF] text-white' 
                  : ['upload', 'parsing', 'reviewing', 'complete'].indexOf(step) > i
                    ? 'bg-green-100 text-green-700'
                    : 'bg-[#F2F2F7] text-[#8E8E93]'
              }`}>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {i + 1}
                </span>
                {{
                  upload: '上传文档',
                  parsing: '解析文档',
                  reviewing: 'AI审查',
                  complete: '审查完成',
                }[s]}
              </div>
              {i < 3 && <ChevronRight className="w-4 h-4 text-[#8E8E93] mx-2" />}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Embedded Header/Toolbar */}
      {embedded && (
        <div className="bg-white border-b border-[#E5E5EA] px-6 py-3">
           <div className="flex items-center justify-between">
              {/* Progress Steps for Embedded View */}
              <div className="flex items-center gap-2">
                {['upload', 'parsing', 'reviewing', 'complete'].map((s, i) => (
                    <div key={s} className="flex items-center">
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        step === s 
                        ? 'bg-[#007AFF] text-white' 
                        : ['upload', 'parsing', 'reviewing', 'complete'].indexOf(step) > i
                            ? 'bg-green-100 text-green-700'
                            : 'bg-[#F2F2F7] text-[#8E8E93]'
                    }`}>
                        <span>{i + 1}</span>
                        <span>{{
                        upload: '上传',
                        parsing: '解析',
                        reviewing: '审查',
                        complete: '完成',
                        }[s]}</span>
                    </div>
                    {i < 3 && <ChevronRight className="w-3 h-3 text-[#8E8E93] mx-1" />}
                    </div>
                ))}
              </div>

              {step !== 'upload' && (
                <button
                onClick={resetReview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#007AFF] hover:bg-[#F2F2F7] rounded-md transition-colors border border-transparent hover:border-[#E5E5EA]"
                >
                <RefreshCw className="w-3.5 h-3.5" />
                重新审查
                </button>
            )}
           </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {/* Upload Step */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E5E5EA] rounded-2xl p-12 text-center bg-white hover:border-[#007AFF] hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[#007AFF]" />
                </div>
                <h3 className="text-lg font-medium text-[#1C1C1E] mb-2">
                  拖放合同文件到这里
                </h3>
                <p className="text-[#8E8E93] mb-4">
                  或点击选择文件
                </p>
                <p className="text-xs text-[#8E8E93]">
                  支持 PDF、Word (.docx)、TXT 格式，最大 20MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
              
              {/* 或者直接输入文本 */}
              <div className="mt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-[#E5E5EA]" />
                  <span className="text-sm text-[#8E8E93]">或者直接粘贴合同文本</span>
                  <div className="flex-1 h-px bg-[#E5E5EA]" />
                </div>
                <textarea
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  placeholder="在此粘贴合同文本内容..."
                  className="w-full h-48 p-4 border border-[#E5E5EA] rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                />
                {contractText && (
                  <button
                    onClick={() => startReview(contractText)}
                    className="mt-4 w-full py-3 bg-[#007AFF] text-white rounded-xl font-medium hover:bg-[#0056b3] transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    开始智能审查
                  </button>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Processing Step */}
          {(step === 'parsing' || step === 'reviewing') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto text-center"
            >
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-[#1C1C1E] mb-2">
                  {step === 'parsing' ? '正在解析文档' : '智能审查中'}
                </h3>
                <div className="flex items-center justify-center gap-2 text-[#007AFF] mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span>{currentAgent}</span>
                </div>
                <p className="text-[#8E8E93]">{agentMessage}</p>
                
                {file && (
                  <div className="mt-6 p-4 bg-[#F2F2F7] rounded-xl flex items-center gap-3">
                    <FileText className="w-8 h-8 text-[#007AFF]" />
                    <div className="text-left flex-1">
                      <p className="font-medium text-[#1C1C1E] truncate">{file.name}</p>
                      <p className="text-sm text-[#8E8E93]">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                )}
                
                {/* 实时显示检测到的风险 */}
                {detectedRisks.length > 0 && (
                  <div className="mt-6 text-left">
                    <p className="text-sm text-[#8E8E93] mb-2">已检测到 {detectedRisks.length} 个风险点</p>
                    <div className="space-y-2">
                      {detectedRisks.slice(0, 3).map((risk, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-3 rounded-lg border ${getRiskLevelColor(risk.level)}`}
                        >
                          <div className="flex items-center gap-2">
                            {getRiskLevelIcon(risk.level)}
                            <span className="font-medium">{risk.title}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Complete Step */}
          {step === 'complete' && reviewResult && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              {/* Summary Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1C1C1E] mb-2">审查结果概览</h3>
                    <p className="text-[#8E8E93]">{reviewResult.summary}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl ${getRiskLevelColor(reviewResult.risk_level)}`}>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      <span className="font-medium">
                        {{
                          low: '低风险',
                          medium: '中等风险',
                          high: '高风险',
                          critical: '严重风险',
                        }[reviewResult.risk_level] || '未知'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">风险评分: {(reviewResult.risk_score * 100).toFixed(0)}%</p>
                  </div>
                </div>
                
                {/* Risk Score Bar */}
                <div className="mt-4">
                  <div className="h-3 bg-[#F2F2F7] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${reviewResult.risk_score * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full ${
                        reviewResult.risk_score > 0.7 ? 'bg-red-500' :
                        reviewResult.risk_score > 0.5 ? 'bg-orange-500' :
                        reviewResult.risk_score > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
              
              {/* Risks List */}
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-[#1C1C1E] mb-4">
                  风险条款 ({reviewResult.key_risks.length})
                </h3>
                <div className="space-y-4">
                  {reviewResult.key_risks.map((risk, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-xl border ${getRiskLevelColor(risk.level)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getRiskLevelIcon(risk.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[#1C1C1E]">{risk.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskLevelColor(risk.level)}`}>
                              {risk.type}
                            </span>
                          </div>
                          <p className="text-sm text-[#3C3C43] mb-2">{risk.description}</p>
                          {risk.suggestion && (
                            <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                              <Sparkles className="w-4 h-4 text-[#007AFF] mt-0.5" />
                              <p className="text-sm text-[#007AFF]">{risk.suggestion}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {reviewResult.key_risks.length === 0 && (
                    <div className="text-center py-8 text-[#8E8E93]">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p>未检测到明显风险条款</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Suggestions */}
              {reviewResult.suggestions.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                  <h3 className="text-lg font-semibold text-[#1C1C1E] mb-4">修改建议</h3>
                  <ul className="space-y-3">
                    {reviewResult.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-[#3C3C43]">{suggestion}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-4">
                <button className="flex-1 py-3 bg-[#007AFF] text-white rounded-xl font-medium hover:bg-[#0056b3] transition-colors flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  导出审查报告
                </button>
                <button className="px-6 py-3 border border-[#E5E5EA] rounded-xl font-medium hover:bg-[#F2F2F7] transition-colors flex items-center justify-center gap-2">
                  <Copy className="w-5 h-5" />
                  复制结果
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
