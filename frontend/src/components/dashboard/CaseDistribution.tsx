import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useState, useEffect } from 'react';
import { casesApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

const COLORS = ['#007AFF', '#AF52DE', '#FF2D55', '#FF9500', '#34C759', '#5856D6', '#FF3B30', '#8E8E93'];

export function CaseDistribution() {
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await casesApi.getStatistics();
      // 将 by_type 转换为图表格式
      const typeData = Object.entries(stats.by_type || {}).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }));
      setData(typeData.length > 0 ? typeData : [
        { name: '暂无数据', value: 0, color: '#8E8E93' }
      ]);
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 h-[380px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl border border-[#E5E5EA] p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-[#1C1C1E]">案件分布</h3>
          <p className="text-sm text-[#8E8E93] mt-1">当前进行中的案件类型统计</p>
        </div>
        <div className="flex gap-2 bg-[#F2F2F7] p-1 rounded-xl">
          <button
            onClick={() => setViewType('pie')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewType === 'pie'
                ? 'bg-white text-[#007AFF] shadow-sm'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            饼图
          </button>
          <button
            onClick={() => setViewType('bar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewType === 'bar'
                ? 'bg-white text-[#007AFF] shadow-sm'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            详情
          </button>
        </div>
      </div>

      {viewType === 'pie' ? (
        <div className="flex items-center gap-8">
          <div className="w-[60%] h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-3">
            {data.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-[#3C3C43] truncate max-w-[100px]">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-[#1C1C1E]">{item.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8E8E93', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8E8E93', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#F2F2F7' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
