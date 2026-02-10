import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Clock, AlertCircle } from 'lucide-react';
import { Case } from './CaseManagement';

interface CaseListProps {
  cases: Case[];
  selectedCase: Case | null;
  onSelectCase: (caseItem: Case) => void;
  onCreateCase: () => void;
}

export function CaseList({ cases, selectedCase, onSelectCase, onCreateCase }: CaseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.includes(searchQuery) ||
      c.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-slate-100 text-slate-700' },
    'in-progress': { label: '进行中', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700' }, // 兼容后端
    waiting: { label: '等待中', color: 'bg-amber-100 text-amber-700' },
    closed: { label: '已结案', color: 'bg-emerald-100 text-emerald-700' },
  };

  const priorityConfig: Record<string, { color: string; dot: string }> = {
    low: { color: 'border-slate-300', dot: 'bg-slate-400' },
    medium: { color: 'border-blue-300', dot: 'bg-blue-500' },
    high: { color: 'border-amber-300', dot: 'bg-amber-500' },
    urgent: { color: 'border-red-300', dot: 'bg-red-500' },
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">案件管理</h2>
            <p className="text-sm text-slate-500 mt-1">共 {cases.length} 个案件</p>
          </div>
          <button
            onClick={onCreateCase}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新建案件
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索案件编号、标题、客户..."
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'pending', 'in-progress', 'waiting', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? '全部' : statusConfig[status]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* Case List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredCases.map((caseItem, index) => {
            const status = statusConfig[caseItem.status] || statusConfig['pending'];
            const priority = priorityConfig[caseItem.priority] || priorityConfig['medium'];

            return (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectCase(caseItem)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedCase?.id === caseItem.id
                    ? 'border-blue-500 bg-blue-50'
                    : `${priority.color} bg-white hover:border-slate-400`
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${priority.dot}`}></div>
                      <span className="text-xs font-mono text-slate-500">{caseItem.caseNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">{caseItem.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>客户：{caseItem.client}</span>
                      <span>·</span>
                      <span>{caseItem.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>负责人：{caseItem.lawyer}</span>
                  {caseItem.deadline && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(caseItem.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">进度</span>
                    <span className="font-medium text-slate-900">{caseItem.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                      style={{ width: `${caseItem.progress}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
