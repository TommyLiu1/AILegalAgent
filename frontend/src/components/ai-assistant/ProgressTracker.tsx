import { motion } from 'framer-motion';
import { Award, Target, TrendingUp } from 'lucide-react';

export function ProgressTracker() {
  const stats = [
    { label: '文书质量分', value: '78', max: 100, icon: Award, color: '#007AFF', bg: 'bg-[#E5F3FF]' },
    { label: '合规率', value: '85', max: 100, icon: Target, color: '#34C759', bg: 'bg-[#E8F8EE]' },
    { label: '本周进步', value: '+12', icon: TrendingUp, color: '#AF52DE', bg: 'bg-[#F5EDFF]' },
  ];

  return (
    <div className="bg-white p-4 lg:p-6 border-b border-[#E5E5EA]">
      <div className="flex items-center gap-2 mb-3 lg:mb-4">
        <h3 className="font-semibold text-[#1C1C1E] text-sm lg:text-base">成长追踪</h3>
        <span className="px-2 py-0.5 bg-[#E8F8EE] text-[#34C759] rounded-full text-xs font-medium">
          新人模式
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="text-center"
            >
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2 shadow-sm`} style={{ color: stat.color }}>
                <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <p className="text-xl lg:text-2xl font-bold text-[#1C1C1E]">{stat.value}</p>
              <p className="text-xs text-[#8E8E93] mt-1">{stat.label}</p>
              {stat.max && (
                <div className="mt-2 h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(parseInt(stat.value) / stat.max) * 100}%` }}
                    transition={{ duration: 1, delay: index * 0.05 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
