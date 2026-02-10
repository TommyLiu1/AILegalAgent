/**
 * 签约/盖章工作流组件
 * 
 * 完整流程设计：
 * 1. 文档就绪检查 → 2. 选择业务类型（合同签约/盖章/律师函/委托书/授权书/法律意见书）
 * 3. 配置签约方/审批流程 → 4. 发起签约/盖章 → 5. 各方签署/审批 → 6. 归档完成
 * 
 * 交互逻辑：
 * - 从画布内容自动检测文档类型
 * - 根据文档类型推荐对应的签约/盖章流程
 * - 支持多方签署、顺序签署
 * - 签署完成后自动归档
 */

import { useState, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSignature, Stamp, FileText, Users, ArrowRight, CheckCircle, XCircle,
  Clock, Shield, ChevronRight, ChevronDown, Plus, X, AlertTriangle,
  Building2, PenTool, BookOpen, Scale, Award, Loader2, ArrowLeft,
  Upload, Download, Eye, Send, UserPlus, Briefcase, Lock,
  Bell, History, RotateCcw, Maximize2,
} from 'lucide-react';
import { useChatStore } from '@/lib/store';
import type {
  SigningWorkflowItem, SigningDocType, SigningWorkflowStatus,
  SigningParty, SigningStep, CanvasContent,
} from '@/lib/store';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// ========== 配置常量 ==========

const DOC_TYPE_CONFIG: Record<SigningDocType, {
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  steps: Omit<SigningStep, 'id'>[];
  sealTypes?: string[];
}> = {
  contract: {
    label: '合同签约',
    desc: '适用于双方/多方合同签署，支持电子签名',
    icon: FileSignature,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    steps: [
      { name: '文档终审', description: '确认合同内容无误', status: 'pending', order: 0 },
      { name: '内部审批', description: '提交公司内部审批流程', status: 'pending', order: 1 },
      { name: '发起签约', description: '向各签约方发送签约邀请', status: 'pending', order: 2 },
      { name: '各方签署', description: '等待所有签约方完成签署', status: 'pending', order: 3 },
      { name: '用印盖章', description: '加盖公司印章', status: 'pending', order: 4 },
      { name: '归档存证', description: '合同归档并上链存证', status: 'pending', order: 5 },
    ],
  },
  lawyer_letter: {
    label: '出具律师函',
    desc: '由律所出具正式律师函，需律师签名及律所盖章',
    icon: BookOpen,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    steps: [
      { name: '律师函定稿', description: '确认律师函内容和格式', status: 'pending', order: 0 },
      { name: '律师审核签名', description: '承办律师审核并签名', status: 'pending', order: 1 },
      { name: '律所合伙人审批', description: '合伙人审批确认', status: 'pending', order: 2 },
      { name: '律所盖章', description: '加盖律师事务所公章', status: 'pending', order: 3 },
      { name: '发送送达', description: '通过指定方式送达对方', status: 'pending', order: 4 },
      { name: '送达确认', description: '确认对方已收到律师函', status: 'pending', order: 5 },
    ],
  },
  authorization: {
    label: '授权书签署',
    desc: '签署授权委托书，明确授权范围和期限',
    icon: Shield,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    steps: [
      { name: '授权内容确认', description: '确认授权范围、期限和条件', status: 'pending', order: 0 },
      { name: '授权人签署', description: '授权人签字确认', status: 'pending', order: 1 },
      { name: '公证/见证', description: '必要时进行公证或第三方见证', status: 'pending', order: 2 },
      { name: '用印盖章', description: '加盖相关印章', status: 'pending', order: 3 },
      { name: '送达被授权人', description: '将授权书送达被授权人', status: 'pending', order: 4 },
    ],
  },
  engagement: {
    label: '委托书签署',
    desc: '与律所签署委托代理协议，明确委托事项和费用',
    icon: Briefcase,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    steps: [
      { name: '委托事项确认', description: '确认委托范围、律师费用及支付方式', status: 'pending', order: 0 },
      { name: '风险告知', description: '律师进行风险告知并签署确认', status: 'pending', order: 1 },
      { name: '委托人签署', description: '委托人签署委托书', status: 'pending', order: 2 },
      { name: '律所签署', description: '律师事务所签署并盖章', status: 'pending', order: 3 },
      { name: '缴纳费用', description: '按约定缴纳律师费及代理费', status: 'pending', order: 4 },
      { name: '案件建档', description: '律所建立案件档案', status: 'pending', order: 5 },
    ],
  },
  legal_opinion: {
    label: '法律意见书',
    desc: '律所出具正式法律意见书，需律师签名及律所盖章',
    icon: Scale,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    steps: [
      { name: '意见书定稿', description: '确认法律意见书内容', status: 'pending', order: 0 },
      { name: '质控审核', description: '律所质控部门审核', status: 'pending', order: 1 },
      { name: '律师签名', description: '承办律师签名确认', status: 'pending', order: 2 },
      { name: '合伙人签名', description: '负责合伙人签名', status: 'pending', order: 3 },
      { name: '律所盖章', description: '加盖律师事务所公章', status: 'pending', order: 4 },
      { name: '出具交付', description: '正式出具并交付委托人', status: 'pending', order: 5 },
    ],
  },
  seal_request: {
    label: '文件盖章',
    desc: '对已定稿文件申请加盖公司印章',
    icon: Stamp,
    color: 'text-red-600 bg-red-50 border-red-200',
    sealTypes: ['公司公章', '合同专用章', '财务专用章', '法人章'],
    steps: [
      { name: '用印申请', description: '提交用印申请并说明用途', status: 'pending', order: 0 },
      { name: '部门负责人审批', description: '申请人所在部门负责人审批', status: 'pending', order: 1 },
      { name: '法务审核', description: '法务部门审核文件合规性', status: 'pending', order: 2 },
      { name: '总经理/董事长审批', description: '高管审批（根据金额/类型）', status: 'pending', order: 3 },
      { name: '印章管理员盖章', description: '印章管理员执行盖章', status: 'pending', order: 4 },
      { name: '用印登记', description: '登记用印记录并归档', status: 'pending', order: 5 },
    ],
  },
};

const URGENCY_CONFIG = {
  normal: { label: '普通', color: 'text-gray-600 bg-gray-100' },
  urgent: { label: '紧急', color: 'text-amber-600 bg-amber-100' },
  critical: { label: '特急', color: 'text-red-600 bg-red-100' },
};

// ========== 主组件 ==========

export const SigningWorkflow = memo(function SigningWorkflow() {
  const store = useChatStore();
  const {
    canvasContent,
    signingWorkflows,
    addSigningWorkflow,
    updateSigningWorkflow,
    activeSigningId,
    setActiveSigningId,
  } = store;

  const [step, setStep] = useState<'list' | 'select' | 'configure' | 'detail'>('list');
  const [selectedDocType, setSelectedDocType] = useState<SigningDocType | null>(null);
  const [selectedSealType, setSelectedSealType] = useState('公司公章');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [parties, setParties] = useState<SigningParty[]>([]);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyRole, setNewPartyRole] = useState<SigningParty['role']>('signer');

  // 签名面板状态
  const [showSignPad, setShowSignPad] = useState(false);
  const [showSealPad, setShowSealPad] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const activeWorkflow = signingWorkflows.find((w) => w.id === activeSigningId);

  // 检测文档就绪
  const isDocReady = !!canvasContent?.content;

  // 电子签名绘制
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const confirmSignature = useCallback(() => {
    setShowSignPad(false);
    toast.success('电子签名已确认');
    if (activeWorkflow) {
      const currentIdx = activeWorkflow.currentStepIndex;
      handleAdvanceStep(activeWorkflow.id, currentIdx);
    }
  }, [activeWorkflow]);

  // 模拟审批日志
  const auditLogs = activeWorkflow ? [
    { time: new Date(activeWorkflow.createdAt).toLocaleString(), action: '流程发起', user: '当前用户', detail: `发起${DOC_TYPE_CONFIG[activeWorkflow.docType].label}流程` },
    ...activeWorkflow.steps
      .filter(s => s.status === 'completed' && s.completedAt)
      .map(s => ({
        time: new Date(s.completedAt!).toLocaleString(),
        action: s.name,
        user: s.assignee || '系统',
        detail: `${s.name}已完成`,
      })),
  ] : [];

  // 推断文档类型
  const detectDocType = useCallback((): SigningDocType | null => {
    if (!canvasContent) return null;
    const text = (canvasContent.title + ' ' + canvasContent.content).toLowerCase();
    if (text.includes('合同') || text.includes('协议') || canvasContent.type === 'contract') return 'contract';
    if (text.includes('律师函') || text.includes('律师信')) return 'lawyer_letter';
    if (text.includes('授权') || text.includes('授权书')) return 'authorization';
    if (text.includes('委托') || text.includes('委托书') || text.includes('委托代理')) return 'engagement';
    if (text.includes('法律意见') || text.includes('意见书')) return 'legal_opinion';
    return 'contract';
  }, [canvasContent]);

  // 添加签约方
  const handleAddParty = useCallback(() => {
    if (!newPartyName.trim()) return;
    setParties((prev) => [
      ...prev,
      {
        id: uuidv4(),
        name: newPartyName.trim(),
        role: newPartyRole,
        status: 'pending',
      },
    ]);
    setNewPartyName('');
  }, [newPartyName, newPartyRole]);

  // 移除签约方
  const handleRemoveParty = useCallback((id: string) => {
    setParties((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // 发起签约流程
  const handleInitiateWorkflow = useCallback(() => {
    if (!selectedDocType || !canvasContent) return;

    const config = DOC_TYPE_CONFIG[selectedDocType];
    const workflow: SigningWorkflowItem = {
      id: uuidv4(),
      docType: selectedDocType,
      title: canvasContent.title || '未命名文档',
      status: 'pending_review',
      content: canvasContent.content,
      parties: parties.length > 0
        ? parties
        : [{ id: uuidv4(), name: '本公司', role: 'initiator', status: 'pending' }],
      steps: config.steps.map((s) => ({ ...s, id: uuidv4() })),
      currentStepIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sealType: selectedDocType === 'seal_request'
        ? (selectedSealType === '合同专用章' ? 'contract' : selectedSealType === '财务专用章' ? 'finance' : selectedSealType === '法人章' ? 'legal' : 'company')
        : undefined,
      urgency,
    };

    addSigningWorkflow(workflow);
    setActiveSigningId(workflow.id);
    setStep('detail');
    toast.success(`${config.label}流程已发起`);

    // 模拟第一步自动开始
    setTimeout(() => {
      const updatedSteps = [...workflow.steps];
      updatedSteps[0] = { ...updatedSteps[0], status: 'in_progress' };
      updateSigningWorkflow(workflow.id, {
        steps: updatedSteps,
        status: 'pending_review',
      });
    }, 1000);

    // 模拟第一步完成
    setTimeout(() => {
      const updatedSteps = [...workflow.steps];
      updatedSteps[0] = { ...updatedSteps[0], status: 'completed', completedAt: Date.now() };
      updatedSteps[1] = { ...updatedSteps[1], status: 'in_progress' };
      updateSigningWorkflow(workflow.id, {
        steps: updatedSteps,
        currentStepIndex: 1,
        status: 'pending_review',
      });
      toast.success('文档终审已通过');
    }, 5000);
  }, [selectedDocType, canvasContent, parties, urgency, selectedSealType, addSigningWorkflow, updateSigningWorkflow, setActiveSigningId]);

  // 手动推进步骤
  const handleAdvanceStep = useCallback((workflowId: string, stepIndex: number) => {
    const wf = signingWorkflows.find((w) => w.id === workflowId);
    if (!wf) return;

    const updatedSteps = [...wf.steps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], status: 'completed', completedAt: Date.now() };
    if (stepIndex + 1 < updatedSteps.length) {
      updatedSteps[stepIndex + 1] = { ...updatedSteps[stepIndex + 1], status: 'in_progress' };
    }

    const allDone = updatedSteps.every((s) => s.status === 'completed');
    updateSigningWorkflow(workflowId, {
      steps: updatedSteps,
      currentStepIndex: Math.min(stepIndex + 1, updatedSteps.length - 1),
      status: allDone ? 'completed' : wf.status,
      completedAt: allDone ? Date.now() : undefined,
    });

    if (allDone) {
      toast.success('所有流程步骤已完成！');
    }
  }, [signingWorkflows, updateSigningWorkflow]);

  const roleLabels: Record<string, string> = {
    initiator: '发起方',
    signer: '签署方',
    reviewer: '审核人',
    approver: '审批人',
    witness: '见证人',
  };

  // ========== 流程详情视图 ==========
  if (step === 'detail' && activeWorkflow) {
    const config = DOC_TYPE_CONFIG[activeWorkflow.docType];
    const Icon = config.icon;
    const completedSteps = activeWorkflow.steps.filter((s) => s.status === 'completed').length;
    const progress = Math.round((completedSteps / activeWorkflow.steps.length) * 100);
    const isAllDone = activeWorkflow.status === 'completed';

    return (
      <div className="h-full flex flex-col">
        {/* 头部 */}
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStep('list'); setActiveSigningId(null); }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{activeWorkflow.title}</p>
              <p className="text-xs text-gray-500">{config.label}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${URGENCY_CONFIG[activeWorkflow.urgency].color}`}>
              {URGENCY_CONFIG[activeWorkflow.urgency].label}
            </span>
          </div>

          {/* 进度条 */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">
                {isAllDone ? '已完成' : `进度 ${completedSteps}/${activeWorkflow.steps.length}`}
              </span>
              <span className="text-[10px] font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isAllDone ? 'bg-green-500' : 'bg-blue-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* 步骤时间线 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-0">
            {activeWorkflow.steps.map((s, idx) => {
              const isCompleted = s.status === 'completed';
              const isActive = s.status === 'in_progress';
              const isPending = s.status === 'pending';

              return (
                <div key={s.id} className="flex gap-3">
                  {/* 时间线轴 */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                        ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    {idx < activeWorkflow.steps.length - 1 && (
                      <div className={`w-0.5 h-12 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>

                  {/* 步骤内容 */}
                  <div className={`flex-1 pb-6 ${isPending ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${
                        isCompleted ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {s.name}
                      </span>
                      {isCompleted && s.completedAt && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>

                    {/* 当前步骤操作按钮 */}
                    {isActive && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => handleAdvanceStep(activeWorkflow.id, idx)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-3 h-3" /> 确认完成
                        </button>
                        {s.name.includes('签') && (
                          <button
                            onClick={() => setShowSignPad(true)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            <PenTool className="w-3 h-3" /> 电子签名
                          </button>
                        )}
                        {s.name.includes('盖章') && (
                          <button
                            onClick={() => setShowSealPad(true)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                          >
                            <Stamp className="w-3 h-3" /> 电子盖章
                          </button>
                        )}
                        {/* 催办按钮 */}
                        {s.assignee && (
                          <button
                            onClick={() => toast.success(`已向 ${s.assignee} 发送催办通知`)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            <Bell className="w-3 h-3" /> 催办
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 签约方列表 */}
          {activeWorkflow.parties.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">签署方</p>
              <div className="space-y-2">
                {activeWorkflow.parties.map((party) => (
                  <div key={party.id} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      party.status === 'signed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {party.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-700">{party.name}</p>
                      <p className="text-[10px] text-gray-400">{roleLabels[party.role] || party.role}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      party.status === 'signed'
                        ? 'bg-green-50 text-green-600'
                        : party.status === 'rejected'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {party.status === 'signed' ? '已签署' : party.status === 'rejected' ? '已拒绝' : '待签署'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 完成状态 */}
          {isAllDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-6 bg-green-50 rounded-xl border border-green-200 text-center"
            >
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-base font-bold text-green-700 mb-1">流程已全部完成</p>
              <p className="text-xs text-green-600 mb-4">所有步骤已完成，文档已自动归档存证</p>
              <div className="flex justify-center gap-2">
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" /> 下载签署件
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white text-green-700 rounded-lg border border-green-300 hover:bg-green-50 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> 查看存证
                </button>
              </div>
            </motion.div>
          )}

          {/* 审批日志/操作记录 */}
          <div className="mt-4">
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-2"
            >
              <History className="w-3.5 h-3.5" />
              <span className="font-medium">操作日志</span>
              <span className="text-gray-400">({auditLogs.length})</span>
              {showAuditLog ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {showAuditLog && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-700">{log.action}</span>
                          <span className="text-gray-400 mx-1">—</span>
                          <span className="text-gray-500">{log.detail}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ========== 电子签名弹出面板 ========== */}
        <AnimatePresence>
          {showSignPad && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-bold text-gray-800">电子签名</span>
                  </div>
                  <button onClick={() => setShowSignPad(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3">请在下方区域手写签名</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 relative">
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={160}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="cursor-crosshair w-full"
                      style={{ touchAction: 'none' }}
                    />
                    {/* 签名线 */}
                    <div className="absolute bottom-8 left-8 right-8 border-b border-gray-300" />
                    <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">签名区域</p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={clearSignature}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> 重新签名
                  </button>
                  <button
                    onClick={confirmSignature}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> 确认签名
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== 电子盖章弹出面板 ========== */}
        <AnimatePresence>
          {showSealPad && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stamp className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-bold text-gray-800">电子盖章</span>
                  </div>
                  <button onClick={() => setShowSealPad(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-4">选择要使用的电子印章</p>

                  {/* 电子印章选择 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {['公司公章', '合同专用章', '财务专用章', '法人章'].map((sealName) => {
                      const isActive = selectedSealType === sealName;
                      return (
                        <button
                          key={sealName}
                          onClick={() => setSelectedSealType(sealName)}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            isActive
                              ? 'border-red-400 bg-red-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {/* 印章可视化 */}
                          <div className="w-14 h-14 mx-auto mb-2 relative">
                            <div className={`w-full h-full rounded-full border-[3px] flex items-center justify-center ${
                              isActive ? 'border-red-500' : 'border-red-300 opacity-50'
                            }`}>
                              <div className={`text-center ${isActive ? 'text-red-600' : 'text-red-300'}`}>
                                <p className="text-[8px] font-bold leading-tight">
                                  {sealName === '法人章' ? '张' : sealName.replace('专用章', '').replace('公司', '')}
                                </p>
                                <p className="text-[6px]">{sealName === '法人章' ? '三' : '★'}</p>
                              </div>
                            </div>
                          </div>
                          <p className={`text-[10px] text-center font-medium ${
                            isActive ? 'text-red-700' : 'text-gray-500'
                          }`}>
                            {sealName}
                          </p>
                          {isActive && (
                            <div className="absolute top-1.5 right-1.5">
                              <CheckCircle className="w-4 h-4 text-red-500" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 安全验证提示 */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">安全验证</span>
                    </div>
                    <p className="text-[10px] text-amber-600">盖章操作将记录操作人身份、时间和IP地址，请确认文件内容无误后再操作。</p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => setShowSealPad(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      setShowSealPad(false);
                      toast.success(`${selectedSealType} 已加盖成功`);
                      if (activeWorkflow) {
                        handleAdvanceStep(activeWorkflow.id, activeWorkflow.currentStepIndex);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <Stamp className="w-3.5 h-3.5" /> 确认盖章
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ========== 配置签约流程 ==========
  if (step === 'configure' && selectedDocType) {
    const config = DOC_TYPE_CONFIG[selectedDocType];
    const Icon = config.icon;

    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
          <button onClick={() => setStep('select')} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-gray-800">{config.label} — 配置</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 文档信息 */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">关联文档</span>
            </div>
            <p className="text-sm font-bold text-gray-800">{canvasContent?.title || '未命名文档'}</p>
          </div>

          {/* 盖章类型（仅盖章申请） */}
          {selectedDocType === 'seal_request' && config.sealTypes && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">印章类型</p>
              <div className="grid grid-cols-2 gap-2">
                {config.sealTypes.map((seal) => (
                  <button
                    key={seal}
                    onClick={() => setSelectedSealType(seal)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedSealType === seal
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Stamp className={`w-4 h-4 ${selectedSealType === seal ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className={`text-xs font-medium ${selectedSealType === seal ? 'text-red-700' : 'text-gray-600'}`}>
                        {seal}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 紧急程度 */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">紧急程度</p>
            <div className="flex gap-2">
              {Object.entries(URGENCY_CONFIG).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setUrgency(key as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                    urgency === key
                      ? `${val.color} border-current`
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* 添加签署方 */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">签署方/参与人</p>
            <div className="flex gap-2 mb-3">
              <input
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="姓名或公司名"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300"
                onKeyDown={(e) => e.key === 'Enter' && handleAddParty()}
              />
              <select
                value={newPartyRole}
                onChange={(e) => setNewPartyRole(e.target.value as any)}
                className="px-2 py-2 text-xs border border-gray-200 rounded-lg outline-none"
              >
                <option value="signer">签署方</option>
                <option value="reviewer">审核人</option>
                <option value="approver">审批人</option>
                <option value="witness">见证人</option>
              </select>
              <button
                onClick={handleAddParty}
                disabled={!newPartyName.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            {parties.length > 0 && (
              <div className="space-y-2">
                {parties.map((party) => (
                  <div key={party.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {party.name[0]}
                    </div>
                    <span className="text-xs font-medium text-gray-700 flex-1">{party.name}</span>
                    <span className="text-[10px] text-gray-400">{roleLabels[party.role]}</span>
                    <button onClick={() => handleRemoveParty(party.id)} className="p-0.5 text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 流程步骤预览 */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">流程步骤预览</p>
            <div className="space-y-1">
              {config.steps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">{s.name}</p>
                    <p className="text-[10px] text-gray-400">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部发起按钮 */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleInitiateWorkflow}
            disabled={!isDocReady}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            发起{config.label}流程
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ========== 选择文档类型 ==========
  if (step === 'select') {
    const detected = detectDocType();

    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
          <button onClick={() => setStep('list')} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-800">选择业务类型</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* 文档状态检查 */}
          <div className={`p-3 rounded-xl border mb-4 ${
            isDocReady
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {isDocReady ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span className={`text-xs font-medium ${isDocReady ? 'text-green-700' : 'text-amber-700'}`}>
                {isDocReady ? '文档已就绪，可发起签约/盖章流程' : '画布中暂无文档，请先生成或打开文档'}
              </span>
            </div>
            {isDocReady && detected && (
              <p className="text-[10px] text-green-600 mt-1 ml-6">
                系统检测为：{DOC_TYPE_CONFIG[detected]?.label}
              </p>
            )}
          </div>

          {/* 业务类型列表 */}
          {(Object.entries(DOC_TYPE_CONFIG) as [SigningDocType, typeof DOC_TYPE_CONFIG[SigningDocType]][]).map(([key, conf]) => {
            const TypeIcon = conf.icon;
            const isDetected = detected === key;

            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedDocType(key);
                  setStep('configure');
                }}
                disabled={!isDocReady}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  isDetected
                    ? `${conf.color} shadow-sm`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${conf.color}`}>
                  <TypeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{conf.label}</span>
                    {isDetected && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                        推荐
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{conf.desc}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{conf.steps.length} 个步骤</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ========== 默认列表视图 ==========
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setDocumentOverlay('none')}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mr-1"
              title="返回文档"
            >
              <X className="w-4 h-4" />
            </button>
            <FileSignature className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-800">签约盖章</span>
          </div>
          <button
            onClick={() => setStep('select')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" /> 发起流程
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {signingWorkflows.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 px-8">
              <div className="w-20 h-20 mx-auto bg-slate-200 rounded-full flex items-center justify-center">
                <FileSignature className="w-10 h-10 text-slate-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-700 mb-2">签约 &amp; 盖章</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  文档确认无误后，可在此发起<br />签约、盖章或出具律师函等流程
                </p>
              </div>
              <div className="pt-4 flex flex-wrap gap-2 justify-center">
                {['合同签约', '文件盖章', '律师函', '委托书', '授权书', '法律意见书'].map(tag => (
                  <span key={tag} className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setStep('select')}
                className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> 发起新流程
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {signingWorkflows.map((wf) => {
              const config = DOC_TYPE_CONFIG[wf.docType];
              const WfIcon = config.icon;
              const completedSteps = wf.steps.filter((s) => s.status === 'completed').length;
              const isAllDone = wf.status === 'completed';

              return (
                <motion.button
                  key={wf.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setActiveSigningId(wf.id); setStep('detail'); }}
                  className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <WfIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{wf.title}</p>
                    <p className="text-xs text-gray-500">{config.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isAllDone ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${(completedSteps / wf.steps.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{completedSteps}/{wf.steps.length}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isAllDone ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">已完成</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">进行中</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${URGENCY_CONFIG[wf.urgency].color}`}>
                      {URGENCY_CONFIG[wf.urgency].label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
