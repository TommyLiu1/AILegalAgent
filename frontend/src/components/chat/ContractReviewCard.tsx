/**
 * 合同审查 A2UI 卡片 — 嵌入智能对话工作台
 * 
 * 非常态化显示：仅当用户在聊天窗口上传合同文件时自动弹出。
 * 支持：
 * 1. 自动读取 store 中的文件并开始解析/审查
 * 2. 手动上传 / 粘贴文本
 * 3. 文档解析 + AI 流式审查
 * 4. 风险结果展示
 * 5. 关闭卡片
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck, Upload, FileText, Loader2, Sparkles,
  AlertTriangle, CheckCircle, XCircle, AlertCircle,
  Shield, ChevronDown, RefreshCw, X,
} from 'lucide-react';
import { contractsApi, ContractReviewStreamEvent } from '@/lib/api';
import { useChatStore } from '@/lib/store';
import { toast } from 'sonner';

type ReviewStep = 'idle' | 'uploading' | 'reviewing' | 'complete';

interface RiskItem {
  type: string;
  title: string;
  level: string;
  description: string;
  suggestion: string;
}

interface QuickResult {
  summary: string;
  risk_level: string;
  risk_score: number;
  key_risks: RiskItem[];
  suggestions: string[];
}

export function ContractReviewCard() {
  const store = useChatStore();
  const { contractReviewFile, setContractReviewVisible, setContractReviewFile } = store;

  const [step, setStep] = useState<ReviewStep>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [contractText, setContractText] = useState('');
  const [currentAgent, setCurrentAgent] = useState('');
  const [agentMessage, setAgentMessage] = useState('');
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [result, setResult] = useState<QuickResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoStartedRef = useRef(false);

  // 当 store 中有文件时，自动开始审查
  useEffect(() => {
    if (contractReviewFile && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setFile(contractReviewFile);
      handleFileSelect(contractReviewFile);
    }
  }, [contractReviewFile]);

  const handleClose = useCallback(() => {
    setContractReviewVisible(false);
    setContractReviewFile(null);
    autoStartedRef.current = false;
  }, [setContractReviewVisible, setContractReviewFile]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setStep('uploading');
    setCurrentAgent('文档解析');
    setAgentMessage('正在解析文档内容...');

    try {
      const parseResult = await contractsApi.parseDocument(selectedFile);
      if (!parseResult.success) {
        toast.error(parseResult.error || '文档解析失败');
        setStep('idle');
        return;
      }
      setContractText(parseResult.text);
      toast.success(`文档解析成功: ${parseResult.contract_type}`);
      await startReview(parseResult.text, parseResult.contract_type);
    } catch (error: any) {
      toast.error(error.message || '解析失败');
      setStep('idle');
    }
  };

  const startReview = async (text: string, contractType?: string) => {
    setStep('reviewing');
    setRisks([]);
    setCurrentAgent('合同审查Agent');
    setAgentMessage('正在进行智能审查...');

    try {
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
              if (event.data) setRisks(event.data);
              break;
            case 'done':
              setResult({
                summary: event.summary || '',
                risk_level: event.risk_level || 'medium',
                risk_score: event.risk_score || 0.5,
                key_risks: risks,
                suggestions: [],
              });
              setStep('complete');
              break;
            case 'error':
              toast.error(event.message || '审查失败');
              break;
          }
        },
        () => fallbackReview(text, contractType),
      );
    } catch {
      await fallbackReview(text, contractType);
    }
  };

  const fallbackReview = async (text: string, contractType?: string) => {
    try {
      setCurrentAgent('合同审查Agent');
      setAgentMessage('正在进行快速审查...');
      const res = await contractsApi.quickReview(text, contractType);
      setResult(res);
      setRisks(res.key_risks);
      setStep('complete');
    } catch (error: any) {
      toast.error(error.message || '审查失败');
      setStep('idle');
    }
  };

  const resetReview = () => {
    setStep('idle');
    setFile(null);
    setContractText('');
    setRisks([]);
    setResult(null);
    autoStartedRef.current = false;
    // 清除 store 中的文件
    setContractReviewFile(null);
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
      case 'high': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
          <FileCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 text-sm">合同智能审查</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {step === 'idle' ? '上传合同文件或粘贴文本，AI 自动识别风险条款' :
             step === 'uploading' ? '正在解析文档...' :
             step === 'reviewing' ? '智能审查中...' :
             '审查完成'}
          </p>
        </div>
        {step === 'complete' && result && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskColor(result.risk_level)}`}>
            {{ low: '低风险', medium: '中风险', high: '高风险', critical: '严重' }[result.risk_level] || '未知'}
          </span>
        )}
        {(step === 'uploading' || step === 'reviewing') && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
        )}
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Card Body — 始终展开 */}
      <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
        {/* === Idle State: Upload === */}
        {step === 'idle' && (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFileSelect(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              <Upload className="w-8 h-8 mx-auto text-blue-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">拖放合同文件或点击上传</p>
              <p className="text-xs text-slate-400 mt-1">支持 PDF、Word、TXT</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
            
            {/* Text Input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">或粘贴合同文本</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="在此粘贴合同文本内容..."
                className="w-full h-24 p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {contractText && (
                <button
                  onClick={() => startReview(contractText)}
                  className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  开始审查
                </button>
              )}
            </div>
          </>
        )}

        {/* === Processing State === */}
        {(step === 'uploading' || step === 'reviewing') && (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
            <p className="font-medium text-slate-800 text-sm">
              {step === 'uploading' ? '正在解析文档' : '智能审查中'}
            </p>
            <div className="flex items-center justify-center gap-1.5 text-blue-600 text-xs mt-1">
              <Sparkles className="w-3 h-3" />
              <span>{currentAgent}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{agentMessage}</p>

            {file && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-3 text-left">
                <FileText className="w-6 h-6 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}

            {/* Real-time risks */}
            {risks.length > 0 && (
              <div className="mt-3 text-left space-y-1.5">
                <p className="text-xs text-slate-400">已检测到 {risks.length} 个风险点</p>
                {risks.slice(0, 3).map((risk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${getRiskColor(risk.level)}`}
                  >
                    {getRiskIcon(risk.level)}
                    <span className="font-medium">{risk.title}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === Complete State === */}
        {step === 'complete' && result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-800">审查概览</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskColor(result.risk_level)}`}>
                    风险评分: {(result.risk_score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Risk Score Bar */}
            <div className="px-1">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.risk_score * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${
                    result.risk_score > 0.7 ? 'bg-red-500' :
                    result.risk_score > 0.5 ? 'bg-orange-500' :
                    result.risk_score > 0.3 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                />
              </div>
            </div>

            {/* Risks */}
            {result.key_risks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  风险条款 ({result.key_risks.length})
                </p>
                {result.key_risks.map((risk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-xl border ${getRiskColor(risk.level)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getRiskIcon(risk.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold">{risk.title}</span>
                          <span className="text-[10px] opacity-70">{risk.type}</span>
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed">{risk.description}</p>
                        {risk.suggestion && (
                          <div className="mt-1.5 flex items-start gap-1.5 p-1.5 bg-white/60 rounded-lg">
                            <Sparkles className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-blue-600">{risk.suggestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {result.key_risks.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-slate-600">未检测到明显风险条款</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={resetReview}
                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重新审查
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
