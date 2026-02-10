import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Loader2, CheckCircle } from 'lucide-react';
import { documentsApi } from '@/lib/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export function AIGenerator() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    docType: '律师函',
    scenario: '',
    clientName: '',
    targetName: '',
    amount: '',
    details: '',
  });
  const [generatedContent, setGeneratedContent] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await documentsApi.generate({
        doc_type: formData.docType,
        scenario: formData.scenario,
        requirements: {
          client: formData.clientName,
          target: formData.targetName,
          amount: formData.amount,
          details: formData.details
        }
      });
      
      // 后端返回的是 DocumentResponse 对象，内容在 extracted_text 中
      const content = response.extracted_text || response.ai_summary || '';
      if (content) {
          setGeneratedContent(content);
          setStep(3);
          toast.success('文档生成成功');
      } else {
          toast.error('生成内容为空，请重试');
      }
    } catch (error: any) {
      console.error('生成失败:', error);
      toast.error(error.message || '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6 bg-[#F2F2F7]">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6 lg:mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                  s === step
                    ? 'bg-[#007AFF] text-white shadow-sm'
                    : s < step
                    ? 'bg-[#34C759] text-white shadow-sm'
                    : 'bg-[#E5E5EA] text-[#8E8E93]'
                }`}
              >
                {s < step ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 lg:w-24 h-1 mx-2 rounded-full ${
                    s < step ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Document Type */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6 lg:mb-8">
              <h3 className="text-lg lg:text-xl font-semibold text-[#1C1C1E] mb-2">
                选择文档类型
              </h3>
              <p className="text-sm text-[#8E8E93]">AI 将根据您的需求生成专业法律文书</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {['律师函', '民事起诉状', '合同协议', '法律意见书', '答辩状', '上诉状'].map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setFormData({ ...formData, docType: type });
                      setStep(2);
                    }}
                    className="p-5 lg:p-6 bg-white border-2 border-[#E5E5EA] rounded-2xl hover:border-[#007AFF] hover:shadow-lg transition-all group active:scale-98"
                  >
                    <FileText className="w-7 h-7 lg:w-8 lg:h-8 text-[#8E8E93] group-hover:text-[#007AFF] mx-auto mb-3 transition-colors" />
                    <p className="font-medium text-[#1C1C1E] text-sm lg:text-base">{type}</p>
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Fill Information */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 lg:space-y-6"
          >
            <div className="text-center mb-6 lg:mb-8">
              <h3 className="text-lg lg:text-xl font-semibold text-[#1C1C1E] mb-2">
                填写基本信息
              </h3>
              <p className="text-sm text-[#8E8E93]">
                AI 将根据以下信息生成{formData.docType}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1C1C1E] mb-2">
                    委托人名称
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                    placeholder="例：XX科技有限公司"
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent text-[#1C1C1E] placeholder:text-[#8E8E93]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1C1C1E] mb-2">
                    对方名称
                  </label>
                  <input
                    type="text"
                    value={formData.targetName}
                    onChange={(e) =>
                      setFormData({ ...formData, targetName: e.target.value })
                    }
                    placeholder="例：YY贸易公司"
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent text-[#1C1C1E] placeholder:text-[#8E8E93]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-2">
                  案件场景
                </label>
                <select
                  value={formData.scenario}
                  onChange={(e) =>
                    setFormData({ ...formData, scenario: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent text-[#1C1C1E]"
                >
                  <option value="">请选择</option>
                  <option>合同违约 - 拖欠货款</option>
                  <option>合同违约 - 未履行服务</option>
                  <option>知识产权侵权</option>
                  <option>劳动纠纷</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-2">
                  涉案金额
                </label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="例：100万元"
                  className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent text-[#1C1C1E] placeholder:text-[#8E8E93]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-2">
                  详细说明
                </label>
                <textarea
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                  placeholder="请详细描述案件事实、时间节点、相关证据等..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent text-[#1C1C1E] placeholder:text-[#8E8E93] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-[#E5E5EA] text-[#1C1C1E] rounded-xl hover:bg-[#F2F2F7] transition-colors font-medium active:scale-98"
              >
                上一步
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 py-3 bg-gradient-to-r from-[#007AFF] to-[#AF52DE] text-white rounded-xl hover:from-[#0051D5] hover:to-[#9042C8] transition-colors font-medium flex items-center justify-center gap-2 shadow-lg active:scale-98"
              >
                <Sparkles className="w-5 h-5" />
                {isGenerating ? '生成中...' : 'AI 生成文档'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Result */}
        {step === 3 && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 lg:space-y-6"
          >
            <div className="text-center mb-6 lg:mb-8">
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#E8F8EE] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 lg:w-8 lg:h-8 text-[#34C759]" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold text-[#1C1C1E] mb-2">
                生成完成！
              </h3>
              <p className="text-sm text-[#8E8E93]">
                AI 已为您生成专业的{formData.docType}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 lg:p-6 shadow-sm">
              <div className="bg-[#F2F2F7] rounded-xl p-4 lg:p-6 min-h-[300px] lg:min-h-[400px] overflow-y-auto max-h-[600px]">
                 <div className="prose prose-sm lg:prose-base max-w-none prose-blue">
                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                 </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-[#E5E5EA] text-[#1C1C1E] rounded-xl hover:bg-[#F2F2F7] transition-colors font-medium active:scale-98"
              >
                重新生成
              </button>
              <button className="flex-1 py-3 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] transition-colors font-medium shadow-sm active:scale-98">
                下载文档
              </button>
            </div>
          </motion.div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 lg:py-20"
          >
            <Loader2 className="w-12 h-12 lg:w-16 lg:h-16 text-[#007AFF] animate-spin mx-auto mb-4" />
            <h3 className="text-lg lg:text-xl font-semibold text-[#1C1C1E] mb-2">
              AI 正在生成文档...
            </h3>
            <p className="text-sm text-[#8E8E93]">
              分析案件信息、检索法律条文、生成专业文书
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
