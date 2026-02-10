/**
 * Lottie 动画组件库
 * 提供常用的预加载动画
 */

import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { motion } from 'framer-motion';
import { cn } from '@/components/a2ui/utils/cn';

/**
 * 动画类型
 */
export type LottieAnimationType =
  | 'loading-spinner'
  | 'success-check'
  | 'error-x'
  | 'thinking-dots'
  | 'sending-message'
  | 'typing-indicator'
  | 'confetti'
  | 'rocket-launch'
  | 'file-upload'
  | 'ai-processing';

/**
 * Lottie 动画组件
 */
interface LottieAnimationProps {
  type: LottieAnimationType;
  size?: number;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  onComplete?: () => void;
}

/**
 * 动画配置 (使用 LottieFiles 的免费动画)
 * 注意: 这些是示例 URL,实际使用时需要替换为真实的 Lottie JSON
 */
const ANIMATION_URLS: Record<LottieAnimationType, string> = {
  'loading-spinner': 'https://lottie.host/832344c0-51f5-4468-8a5a-5b4c3c2f1e2e/loading.json',
  'success-check': 'https://lottie.host/12345678-1234-1234-1234-123456789abc/success.json',
  'error-x': 'https://lottie.host/87654321-4321-4321-4321-cba987654321/error.json',
  'thinking-dots': 'https://lottie.host/11111111-2222-3333-4444-555555555555/thinking.json',
  'sending-message': 'https://lottie.host/22222222-3333-4444-5555-666666666666/sending.json',
  'typing-indicator': 'https://lottie.host/33333333-4444-5555-6666-777777777777/typing.json',
  'confetti': 'https://lottie.host/44444444-5555-6666-7777-888888888888/confetti.json',
  'rocket-launch': 'https://lottie.host/55555555-6666-7777-8888-999999999999/rocket.json',
  'file-upload': 'https://lottie.host/66666666-7777-8888-9999-000000000000/upload.json',
  'ai-processing': 'https://lottie.host/77777777-8888-9999-0000-111111111111/ai.json',
};

/**
 * 简化版动画配置 (内联,不依赖外部 URL)
 * 这里使用 CSS 动画模拟 Lottie 效果
 */
const SIMPLE_ANIMATIONS: Record<LottieAnimationType, React.ReactNode> = {
  'loading-spinner': (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-3/4 h-3/4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
  'success-check': (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        className="w-3/4 h-3/4 rounded-full bg-green-500 flex items-center justify-center"
      >
        <svg
          className="w-1/2 h-1/2 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>
    </div>
  ),
  'error-x': (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        className="w-3/4 h-3/4 rounded-full bg-red-500 flex items-center justify-center"
      >
        <svg
          className="w-1/2 h-1/2 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </motion.div>
    </div>
  ),
  'thinking-dots': (
    <div className="w-full h-full flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1/4 h-1/4 rounded-full bg-blue-500"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  ),
  'sending-message': (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ x: [-10, 10, -10] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        className="w-1 h-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
      />
    </div>
  ),
  'typing-indicator': (
    <div className="w-full h-full flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1/4 h-1/4 rounded-full bg-gray-400"
          animate={{
            scaleY: [1, 2, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  ),
  'confetti': (
    <div className="w-full h-full relative">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: ['#ff0', '#f00', '#0f0', '#00f', '#f0f'][Math.floor(Math.random() * 5)],
          }}
          initial={{ y: -10, opacity: 0 }}
          animate={{
            y: [null, 100, 100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  ),
  'rocket-launch': (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: [-10, -20, -10] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="text-3xl"
      >
        🚀
      </motion.div>
    </div>
  ),
  'file-upload': (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-3xl"
      >
        📁
      </motion.div>
    </div>
  ),
  'ai-processing': (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-3xl"
      >
        🤖
      </motion.div>
    </div>
  ),
};

/**
 * LottieAnimation 组件
 */
export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  type,
  size = 24,
  className,
  loop = true,
  autoplay = true,
  onComplete,
}) => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // 尝试加载 Lottie JSON
    const url = ANIMATION_URLS[type];
    // 实际使用时可以从 URL 加载
    // 这里使用简化版动画
  }, [type]);

  // 使用简化版动画
  const simpleAnimation = SIMPLE_ANIMATIONS[type];

  return (
    <div
      className={cn('flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {simpleAnimation}
    </div>
  );
};

/**
 * 预设大小的动画组件
 */
export const LottieSpinner: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className,
}) => <LottieAnimation type="loading-spinner" size={size} className={className} />;

export const LottieSuccess: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className,
}) => <LottieAnimation type="success-check" size={size} className={className} />;

export const LottieError: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className,
}) => <LottieAnimation type="error-x" size={size} className={className} />;

export const LottieThinking: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className,
}) => <LottieAnimation type="thinking-dots" size={size} className={className} loop />;

export const LottieConfetti: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className,
}) => <LottieAnimation type="confetti" size={size} className={className} loop={false} />;

export const LottieRocket: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className,
}) => <LottieAnimation type="rocket-launch" size={size} className={className} loop />;

/**
 * 集成到 A2UI Button 的动画
 */
export const LottieButtonIcon: React.FC<{
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  size?: number;
}> = ({ loading, success, error, size = 20 }) => {
  if (loading) return <LottieSpinner size={size} />;
  if (success) return <LottieSuccess size={size} />;
  if (error) return <LottieError size={size} />;
  return null;
};

/**
 * 默认导出
 */
export default LottieAnimation;
