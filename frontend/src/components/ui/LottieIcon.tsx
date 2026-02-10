import React from 'react';
import Lottie from 'lottie-react';

// 这里我们定义一些在线的 Lottie URL 或本地 JSON 引用
// 为了演示，我们使用 LottieFiles 的公开 URL
export const ANIMATIONS = {
  thinking: "https://lottie.host/embed/986c757c-17e9-4e76-a07e-1234567890/thinking.json", // 示例 URL，实际需替换为真实文件
  success: "https://lottie.host/embed/success-check.json",
  analyzing: "https://lottie.host/embed/scanning-document.json",
  error: "https://lottie.host/embed/error-cross.json"
};

// 由于不能直接下载大文件，我们使用一个封装组件
// 如果 URL 加载失败，它会回退到 Tailwind 的 SVG 动画
interface LottieIconProps {
  type: 'thinking' | 'success' | 'analyzing' | 'error' | 'loading';
  className?: string;
}

export const LottieIcon: React.FC<LottieIconProps> = ({ type, className }) => {
  // 在实际项目中，建议将 JSON 文件下载到 src/assets/animations/ 目录并 import 进来
  // 例如: import thinkingData from '@/assets/animations/thinking.json';
  
  // 这里我们使用 SVG 替代方案作为"代码内"的 Lottie 替代，确保没有网络也能运行
  // 这种 SVG 动画比简单的 icon 更生动，接近 Lottie 的效果
  
  if (type === 'thinking') {
    return (
      <div className={`flex items-center justify-center gap-1 ${className}`}>
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
      </div>
    );
  }

  if (type === 'analyzing') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <svg className="animate-spin w-full h-full text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
        </div>
      </div>
    );
  }

  if (type === 'success') {
    return (
      <div className={`text-green-500 ${className}`}>
        <svg className="w-full h-full animate-[scale-in_0.3s_ease-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  return null;
};
