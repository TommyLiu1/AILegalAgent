import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface RiskRadarProps {
  data: {
    scores: Record<string, number>;
    issues: Array<{
      type: 'high' | 'medium' | 'low';
      text: string;
    }>;
  };
}

export function RiskRadar({ data }: RiskRadarProps) {
  const chartData = Object.entries(data.scores).map(([name, value]) => ({
    dimension: name,
    value: value,
    fullMark: 100,
  }));

  const issueIcons = {
    high: AlertTriangle,
    medium: AlertCircle,
    low: Info,
  };

  const issueColors = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full p-6 overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-1">风险分析报告</h3>
          <p className="text-sm text-slate-500">基于 AI 多维度审查生成</p>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="font-medium text-slate-900 mb-4">风险雷达图</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#64748b', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Radar
                name="风险评分"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span>100 = 无风险</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>0 = 高风险</span>
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="font-medium text-slate-900 mb-4">发现的问题</h4>
          <div className="space-y-3">
            {data.issues.map((issue, index) => {
              const Icon = issueIcons[issue.type];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${issueColors[issue.type]}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed">{issue.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">综合风险评分</p>
              <p className="font-bold">62 / 100</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm mb-1">建议</p>
              <p className="font-medium text-sm">需要修订后签署</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
