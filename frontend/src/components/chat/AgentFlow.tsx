import { motion } from 'framer-motion';
import { Search, Shield, FileCheck, Brain, Loader2 } from 'lucide-react';

const agents = [
  {
    id: 'search',
    name: 'Search Agent',
    icon: Search,
    status: 'working',
    thought: '正在检索相关判例和法规...',
    color: 'blue',
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    icon: Shield,
    status: 'working',
    thought: '对照《民法典》进行合规性审查...',
    color: 'emerald',
  },
  {
    id: 'risk',
    name: 'Risk Agent',
    icon: FileCheck,
    status: 'working',
    thought: '分析潜在法律风险点...',
    color: 'amber',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    icon: Brain,
    status: 'coordinating',
    thought: '协调各智能体，整合分析结果...',
    color: 'purple',
  },
];

export function AgentFlow() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full mx-4"
      >
        <div className="text-center mb-8">
          <h3 className="font-semibold text-slate-900 mb-2">Multi-Agent 协同分析中</h3>
          <p className="text-sm text-slate-500">多个智能体正在并行处理您的请求</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              emerald: 'bg-emerald-100 text-emerald-600',
              amber: 'bg-amber-100 text-amber-600',
              purple: 'bg-purple-100 text-purple-600',
            };

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[agent.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-slate-900">{agent.name}</h4>
                      <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{agent.thought}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Connection Lines Animation */}
        <div className="mt-6 relative h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
