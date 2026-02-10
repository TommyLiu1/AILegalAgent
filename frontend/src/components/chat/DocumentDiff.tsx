import { motion } from 'framer-motion';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';

const originalContent = [
  { id: 1, text: '第三条 付款方式', type: 'normal' },
  { id: 2, text: '乙方应在收到发票后10日内付款', type: 'risk', issue: '时间约定模糊，建议明确工作日' },
  { id: 3, text: '第四条 保密条款', type: 'normal' },
  { id: 4, text: '双方应对项目信息保密', type: 'risk', issue: '保密范围不明确，建议补充具体内容' },
  { id: 5, text: '第五条 违约责任', type: 'normal' },
  { id: 6, text: '违约方应赔偿损失，上限为合同金额的10%', type: 'risk', issue: '违约上限过低，建议提高到30%' },
];

const suggestedContent = [
  { id: 1, text: '第三条 付款方式', type: 'normal' },
  { id: 2, text: '乙方应在收到增值税专用发票后10个工作日内完成付款', type: 'added', reason: '明确了工作日和发票类型' },
  { id: 3, text: '第四条 保密条款', type: 'normal' },
  { id: 4, text: '双方应对项目中涉及的技术资料、商业信息、客户数据等进行保密，保密期限为合同终止后3年', type: 'added', reason: '明确了保密范围和期限' },
  { id: 5, text: '第五条 违约责任', type: 'normal' },
  { id: 6, text: '违约方应赔偿守约方因此遭受的全部损失，赔偿上限为合同金额的30%', type: 'added', reason: '提高了违约成本' },
  { id: 7, text: '第六条 不可抗力', type: 'new', reason: '新增条款，明确不可抗力情形' },
  { id: 8, text: '因不可抗力导致合同无法履行的，双方可协商解除合同，互不承担违约责任', type: 'new' },
];

export function DocumentDiff() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full p-6 overflow-y-auto bg-slate-50"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">文档对比视图</h3>
            <p className="text-sm text-slate-500">红色 = 风险点 | 绿色 = AI 优化建议</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              接受全部建议
            </button>
          </div>
        </div>

        {/* Split View */}
        <div className="grid grid-cols-2 gap-4">
          {/* Original */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-sm text-slate-900">原始文档</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {originalContent.map((item) => (
                <div key={item.id}>
                  <p
                    className={`text-sm leading-relaxed p-2 rounded ${
                      item.type === 'risk'
                        ? 'bg-red-50 border border-red-200 text-red-900'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.text}
                  </p>
                  {item.type === 'risk' && (
                    <div className="mt-1 flex items-start gap-2 text-xs text-red-600 px-2">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{item.issue}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Suggested */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-100 px-4 py-3 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span className="font-medium text-sm text-emerald-900">AI 优化版本</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {suggestedContent.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <p
                    className={`text-sm leading-relaxed p-2 rounded ${
                      item.type === 'added' || item.type === 'new'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.text}
                  </p>
                  {(item.type === 'added' || item.type === 'new') && (
                    <div className="mt-1 flex items-start gap-2 text-xs text-emerald-700 px-2">
                      <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{item.reason}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-medium text-slate-900 mb-3 text-sm">修改摘要</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">3</p>
              <p className="text-xs text-red-700 mt-1">风险点</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">3</p>
              <p className="text-xs text-emerald-700 mt-1">优化建议</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">2</p>
              <p className="text-xs text-blue-700 mt-1">新增条款</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
