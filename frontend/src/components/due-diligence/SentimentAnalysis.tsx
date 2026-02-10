import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, MessageSquare, Newspaper, AlertTriangle, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface SentimentAnalysisProps {
  data?: {
    operation_risk?: number;
    litigation_risk?: number;
    credit_risk?: number;
    compliance_risk?: number;
    relation_risk?: number;
    overall_rating?: string;
    risk_points?: string[];
  };
}

const defaultSentimentData = [
  { source: '新闻报道', positive: 35, negative: 5, neutral: 10 },
  { source: '社交媒体', positive: 28, negative: 12, neutral: 15 },
  { source: '行业评价', positive: 20, negative: 3, neutral: 8 },
  { source: '客户反馈', positive: 42, negative: 8, neutral: 12 },
];

const recentNews = [
  {
    id: 1,
    title: '该公司获得B轮融资5000万元',
    sentiment: 'positive',
    source: '36氪',
    date: '2024-01-10',
  },
  {
    id: 2,
    title: '发布新一代AI产品，市场反响良好',
    sentiment: 'positive',
    source: '科技日报',
    date: '2024-01-08',
  },
  {
    id: 3,
    title: '因广告宣传问题被监管部门约谈',
    sentiment: 'negative',
    source: '财经网',
    date: '2024-01-05',
  },
];

export function SentimentAnalysis({ data }: SentimentAnalysisProps) {
  // 如果有风险数据，显示风险雷达图
  const riskData = data ? [
    { subject: '经营风险', score: data.operation_risk || 30 },
    { subject: '诉讼风险', score: data.litigation_risk || 40 },
    { subject: '信用风险', score: data.credit_risk || 25 },
    { subject: '合规风险', score: data.compliance_risk || 30 },
    { subject: '关联风险', score: data.relation_risk || 20 },
  ] : null;

  const sentimentData = defaultSentimentData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl border border-slate-200 p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="font-semibold text-slate-900">舆情分析</h3>
          <p className="text-sm text-slate-500">基于 MiroFish 舆情数据引擎</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Chart */}
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="source" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="positive" stackId="a" fill="#10b981" />
              <Bar dataKey="neutral" stackId="a" fill="#94a3b8" />
              <Bar dataKey="negative" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">正面</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span className="text-slate-600">中性</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-600">负面</span>
            </div>
          </div>
        </div>

        {/* Recent News */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3 text-sm">近期舆情动态</h4>
          <div className="space-y-3">
            {recentNews.map((news, index) => (
              <motion.div
                key={news.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border ${
                  news.sentiment === 'positive'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  {news.sentiment === 'positive' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm leading-relaxed text-slate-900">{news.title}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 ml-6">
                  <span>{news.source}</span>
                  <span>·</span>
                  <span>{news.date}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
