/**
 * 工作台需求确认卡片 — 单选/多选交互
 * 
 * 从左侧对话分析过程中自动触发，在右侧工作台展示
 * 支持单选（radio）和多选（checkbox）两种模式
 * 确认后锁定选择，通过回调通知上层
 */

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Circle, Square, CheckSquare,
  HelpCircle, ArrowRight, Lock,
  FileText, Scale, Shield, BookOpen, Gavel,
  AlertTriangle, Building, Briefcase,
} from 'lucide-react';
import type { WorkspaceConfirmation } from '@/lib/store';

interface WorkspaceConfirmationCardProps {
  confirmation: WorkspaceConfirmation;
  onConfirm: (selectedIds: string[]) => void;
}

// 图标映射
const iconMap: Record<string, React.ElementType> = {
  document: FileText,
  contract: Scale,
  compliance: Shield,
  research: BookOpen,
  litigation: Gavel,
  risk: AlertTriangle,
  company: Building,
  labor: Briefcase,
};

export const WorkspaceConfirmationCard = memo(function WorkspaceConfirmationCard({
  confirmation,
  onConfirm,
}: WorkspaceConfirmationCardProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(confirmation.selectedIds);
  const isConfirmed = confirmation.status === 'confirmed';
  const isSingle = confirmation.type === 'single';

  const handleToggle = (optionId: string) => {
    if (isConfirmed) return;

    if (isSingle) {
      setLocalSelected([optionId]);
    } else {
      setLocalSelected(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const handleConfirm = () => {
    if (localSelected.length === 0 || isConfirmed) return;
    onConfirm(localSelected);
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isConfirmed
        ? 'border-green-200 bg-green-50/30'
        : 'border-blue-200 bg-white shadow-sm'
    }`}>
      {/* 头部 */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isConfirmed
          ? 'bg-green-50 border-green-100'
          : 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-100'
      }`}>
        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <HelpCircle className="w-4 h-4 text-blue-600" />
          )}
          <span className="text-sm font-bold text-gray-800">{confirmation.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isConfirmed ? (
            <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <Lock className="w-3 h-3" />
              已确认
            </span>
          ) : (
            <span className="text-[11px] text-blue-500 font-medium">
              {isSingle ? '单选' : '多选'}
            </span>
          )}
        </div>
      </div>

      {/* 描述 */}
      {confirmation.description && (
        <div className="px-4 pt-3">
          <p className="text-xs text-gray-500 leading-relaxed">{confirmation.description}</p>
        </div>
      )}

      {/* 选项列表 */}
      <div className="p-3 space-y-2">
        {confirmation.options.map((option) => {
          const isSelected = localSelected.includes(option.id);
          const OptionIcon = option.icon ? (iconMap[option.icon] || Circle) : null;

          return (
            <motion.button
              key={option.id}
              onClick={() => handleToggle(option.id)}
              disabled={isConfirmed}
              whileTap={isConfirmed ? {} : { scale: 0.98 }}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-3 ${
                isConfirmed
                  ? isSelected
                    ? 'border-green-200 bg-green-50/60'
                    : 'border-gray-100 bg-gray-50/50 opacity-50'
                  : isSelected
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-gray-150 bg-white hover:border-blue-200 hover:bg-blue-50/30'
              }`}
            >
              {/* 选择指示器 */}
              <div className="flex-shrink-0">
                {isConfirmed && isSelected ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                ) : isSingle ? (
                  isSelected ? (
                    <div className="w-4.5 h-4.5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  ) : (
                    <Circle className="w-4.5 h-4.5 text-gray-300" />
                  )
                ) : (
                  isSelected ? (
                    <CheckSquare className="w-4.5 h-4.5 text-blue-500" />
                  ) : (
                    <Square className="w-4.5 h-4.5 text-gray-300" />
                  )
                )}
              </div>

              {/* 图标 */}
              {OptionIcon && (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <OptionIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
              )}

              {/* 文本 */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isSelected ? 'text-gray-800' : 'text-gray-600'
                }`}>{option.label}</p>
                {option.description && (
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{option.description}</p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 确认按钮 */}
      {!isConfirmed && (
        <div className="px-4 pb-3">
          <motion.button
            onClick={handleConfirm}
            disabled={localSelected.length === 0}
            whileHover={localSelected.length > 0 ? { scale: 1.01 } : {}}
            whileTap={localSelected.length > 0 ? { scale: 0.98 } : {}}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              localSelected.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            确认选择
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      )}

      {/* 来源标注 */}
      {confirmation.source && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-gray-300 text-right">
            来自 {confirmation.source}
          </p>
        </div>
      )}
    </div>
  );
});
