import { motion } from 'framer-motion';
import { Briefcase, Users, TrendingUp, AlertTriangle, Loader2, Brain, Database, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { casesApi, knowledgeApi } from '@/lib/api';
import { LottieIcon } from '@/components/ui/LottieIcon';

export function DashboardHeader() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // 并行请求数据
      const [casesData, knowledgeData] = await Promise.all([
        casesApi.getStatistics(),
        knowledgeApi.listBases({ page_size: 1 }) // 只需总数
      ]);
      
      const statItems = [
        {
          label: '进行中案件',
          value: casesData.total.toString(),
          unit: '件',
          icon: Briefcase,
          lottie: 'analyzing', // 映射到 LottieIcon
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        },
        {
          label: '高风险预警',
          value: (casesData.by_priority?.urgent || 0).toString(),
          unit: '个',
          icon: AlertTriangle,
          lottie: 'error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        },
        {
          label: '知识库资源',
          value: knowledgeData.total.toString(),
          unit: '个库',
          icon: Brain,
          lottie: 'thinking',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
        },
        {
          label: '自我进化次数',
          value: '--', // 暂无后端统计 API
          unit: '次迭代',
          icon: Activity,
          lottie: 'success',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
        },
      ];
      setStats(statItems);
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm h-[140px] flex items-center justify-center">
            <LottieIcon type="thinking" className="w-12 h-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {stats.map((stat, index) => {
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
          >
            {/* 装饰背景 */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 translate-x-8 -translate-y-8 ${stat.bgColor.replace('bg-', 'bg-')}`} />

            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                {/* 优先显示 Lottie，如果没有则显示 Icon */}
                <LottieIcon type={stat.lottie} className="w-8 h-8" />
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100`}>
                实时
              </span>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-baseline gap-1 mb-1">
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                <span className="text-xs text-gray-500 font-medium">{stat.unit}</span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                {stat.label}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
