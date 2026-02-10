/**
 * MemoryVisualization Component
 * 显示记忆来源和使用情况
 */

import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, Brain, CheckCircle } from 'lucide-react';
import { cn } from '@/components/a2ui/utils/cn';

interface MemorySourceBadgeProps {
  sources: {
    semantic?: number;
    episodic?: number;
    working?: boolean;
  };
  className?: string;
}

/**
 * 记忆来源徽章组件
 */
export function MemorySourceBadge({ sources, className }: MemorySourceBadgeProps) {
  const badges = [];

  if (sources.semantic && sources.semantic > 0) {
    badges.push({
      type: 'semantic',
      icon: BookOpen,
      label: '知识库',
      count: sources.semantic,
      color: 'bg-blue-100 text-blue-700',
      iconColor: 'text-blue-500',
    });
  }

  if (sources.episodic && sources.episodic > 0) {
    badges.push({
      type: 'episodic',
      icon: Lightbulb,
      label: '历史案例',
      count: sources.episodic,
      color: 'bg-purple-100 text-purple-700',
      iconColor: 'text-purple-500',
    });
  }

  if (sources.working) {
    badges.push({
      type: 'working',
      icon: Brain,
      label: '会话记忆',
      count: 1,
      color: 'bg-green-100 text-green-700',
      iconColor: 'text-green-500',
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1 text-xs text-gray-500 mr-2">
        <Brain className="w-3 h-3" />
        <span>已使用记忆</span>
      </div>
      {badges.map((badge) => (
        <motion.div
          key={badge.type}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            badge.color
          )}
        >
          <badge.icon className={cn('w-3 h-3', badge.iconColor)} />
          <span>{badge.label}</span>
          {badge.count > 1 && <span>x{badge.count}</span>}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * 记忆检索详情面板
 */
interface MemoryRetrievalDetailsProps {
  semantic?: Array<{
    knowledge_id: string;
    title: string;
    similarity_score: number;
  }>;
  episodic?: Array<{
    episode_id: string;
    task_description: string;
    user_rating: number;
    similarity_score: number;
  }>;
  className?: string;
}

export function MemoryRetrievalDetails({
  semantic = [],
  episodic = [],
  className,
}: MemoryRetrievalDetailsProps) {
  if (semantic.length === 0 && episodic.length === 0) {
    return (
      <div className={cn('text-center py-4 text-gray-400 text-sm', className)}>
        <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>未使用记忆</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 语义记忆 */}
      {semantic.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-blue-500" />
            语义记忆 (知识库)
          </h4>
          <div className="space-y-2">
            {semantic.map((item, index) => (
              <div
                key={item.knowledge_id || index}
                className="p-2 bg-blue-50 border border-blue-100 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-800 truncate flex-1">
                    {item.title}
                  </p>
                  <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    {(item.similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 情景记忆 */}
      {episodic.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-purple-500" />
            情景记忆 (历史案例)
          </h4>
          <div className="space-y-2">
            {episodic.map((item, index) => (
              <div
                key={item.episode_id || index}
                className="p-2 bg-purple-50 border border-purple-100 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-600 truncate flex-1">
                    {item.task_description}
                  </p>
                  <div className="flex items-center gap-1">
                    {item.user_rating >= 4 && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                      {item.user_rating}★
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    相似度: {(item.similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 记忆统计卡片
 */
interface MemoryStatsProps {
  semanticCount?: number;
  episodicCount?: number;
  workingSessions?: number;
  retrievalTime?: number;
  className?: string;
}

export function MemoryStats({
  semanticCount = 0,
  episodicCount = 0,
  workingSessions = 0,
  retrievalTime = 0,
  className,
}: MemoryStatsProps) {
  const stats = [
    {
      label: '语义记忆',
      value: semanticCount,
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: '情景记忆',
      value: episodicCount,
      icon: Lightbulb,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      label: '活跃会话',
      value: workingSessions,
      icon: Brain,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-3 bg-white border border-gray-200 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className={cn('w-4 h-4', stat.color)} />
            <span className="text-xs text-gray-600">{stat.label}</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{stat.value}</p>
        </div>
      ))}
      {retrievalTime > 0 && (
        <div className="col-span-3 p-2 bg-gray-50 rounded-lg text-center">
          <span className="text-xs text-gray-500">
            检索耗时: {retrievalTime.toFixed(3)}秒
          </span>
        </div>
      )}
    </div>
  );
}
