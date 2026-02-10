import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, User, Clock, FileText, MessageSquare, Paperclip, CheckCircle, FileOutput, Loader2 } from 'lucide-react';
import { Case } from './CaseManagement';
import { useState, useEffect } from 'react';
import { LottieIcon } from '../ui/LottieIcon';
import { casesApi, documentsApi, Document } from '@/lib/api';
import { toast } from 'sonner';

interface CaseDetailProps {
  case: Case;
  onClose: () => void;
}

export function CaseDetail({ case: caseItem, onClose }: CaseDetailProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingContent, setBriefingContent] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // 加载关联数据
  useEffect(() => {
    const loadData = async () => {
      if (!caseItem.id) return;
      try {
        // 加载文档
        const docs = await documentsApi.list({ case_id: caseItem.id });
        setDocuments(docs.items);
        
        // 加载活动/事件
        const timeline = await casesApi.getTimeline(caseItem.id);
        const mappedActivities = timeline.map((event: any) => ({
            id: event.id,
            type: event.event_type,
            user: '系统', // 后端暂无 user 字段，暂用系统
            content: event.description || event.title,
            time: event.event_time
        }));
        setActivities(mappedActivities);

      } catch (error) {
        console.error('加载案件详情失败', error);
      }
    };
    loadData();
  }, [caseItem.id]);

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-700',
    waiting: 'bg-amber-100 text-amber-700',
    closed: 'bg-emerald-100 text-emerald-700',
  };

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    'in-progress': '进行中',
    in_progress: '进行中',
    waiting: '等待中',
    closed: '已结案',
  };

  const handleGenerateBriefing = async () => {
    setIsGenerating(true);
    try {
        // 调用真实 API 生成简报
        const response = await casesApi.generateBriefing(caseItem.id);
        setBriefingContent(response.content);
        setShowBriefing(true);
        toast.success('简报生成成功');
    } catch (error) {
        console.error('生成简报失败', error);
        toast.error('生成简报失败，请稍后重试');
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Briefing Modal Overlay */}
      <AnimatePresence>
        {showBriefing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col p-8"
          >
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <FileOutput className="w-6 h-6 text-blue-600" />
                  律师交接简报
                </h2>
                <button 
                  onClick={() => setShowBriefing(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-6 border border-slate-200 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {briefingContent}
             </div>

             <div className="mt-6 flex gap-4 justify-end">
                <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  复制内容
                </button>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  导出 PDF
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono text-slate-600">{caseItem.caseNumber}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[caseItem.status] || statusColors.pending}`}>
                {statusLabels[caseItem.status] || caseItem.status}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{caseItem.title}</h2>
            <p className="text-sm text-slate-600">{caseItem.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-600">客户</span>
            </div>
            <p className="font-medium text-slate-900 text-sm">{caseItem.client}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-slate-600">负责律师</span>
            </div>
            <p className="font-medium text-slate-900 text-sm">{caseItem.lawyer}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-slate-600">标的金额</span>
            </div>
            <p className="font-medium text-slate-900 text-sm">{caseItem.amount || '未设置'}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-slate-600">截止日期</span>
            </div>
            <p className="font-medium text-slate-900 text-sm">{caseItem.deadline ? new Date(caseItem.deadline).toLocaleDateString() : '未设置'}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Progress */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              案件进度
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">整体完成度</span>
                <span className="text-lg font-bold text-blue-600">{caseItem.progress}%</span>
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden border border-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${caseItem.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                ></motion.div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-purple-600" />
              相关文档 ({documents.length})
            </h3>
            <div className="space-y-2">
              {documents.length > 0 ? documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm text-slate-900">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{doc.doc_type}</span>
                        <span>·</span>
                        <span>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '未知大小'}</span>
                        <span>·</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                    暂无相关文档
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              活动记录
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-10"
                  >
                    <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-slate-900">{activity.user}</span>
                        <span className="text-xs text-slate-500">{new Date(activity.time).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-600">{activity.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-2">
          <button 
            onClick={handleGenerateBriefing}
            disabled={isGenerating}
            className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all text-sm font-medium flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
          >
            {isGenerating ? (
               <>
                 <LottieIcon type="thinking" className="w-5 h-5" />
                 生成简报中...
               </>
            ) : (
               <>
                 <FileOutput className="w-4 h-4" />
                 生成律师交接简报
               </>
            )}
          </button>
          <button className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
            添加备注
          </button>
        </div>
      </div>
    </div>
  );
}
