import * as React from "react";
import { cn } from "./utils";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  text?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

const sizeMap = {
  sm: { icon: "w-5 h-5", text: "text-xs", padding: "py-6" },
  default: { icon: "w-8 h-8", text: "text-sm", padding: "py-12" },
  lg: { icon: "w-10 h-10", text: "text-base", padding: "py-16" },
};

/**
 * 统一加载状态组件
 * 用于数据加载中的占位显示
 */
export function LoadingState({ text = "加载中...", className, size = "default" }: LoadingStateProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", s.padding, className)}>
      <Loader2 className={cn(s.icon, "animate-spin text-primary")} />
      <p className={cn(s.text, "text-muted-foreground")}>{text}</p>
    </div>
  );
}

/**
 * 全屏加载状态 - 用于页面级加载
 */
export function PageLoadingState({ text }: { text?: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <LoadingState text={text} size="lg" />
    </div>
  );
}
