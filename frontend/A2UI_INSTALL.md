# 前端依赖安装指南

## 新增依赖

为了支持 A2UI 框架,需要安装以下依赖:

```bash
cd frontend

# 核心依赖
npm install framer-motion clsx tailwind-merge

# Lottie 动画 (可选,Week 2 集成)
npm install lottie-react

# 已有依赖 (请确认)
npm install react react-dom
```

## package.json 更新

请在 `frontend/package.json` 中确认或添加以下依赖:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.16.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lottie-react": "^2.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0"
  }
}
```

## 安装命令

```bash
# 安装所有依赖
npm install

# 或单独安装新依赖
npm install framer-motion clsx tailwind-merge lottie-react
```

## 验证安装

安装完成后,可以通过以下命令验证:

```bash
# 检查 framer-motion
npm list framer-motion

# 检查其他依赖
npm list clsx tailwind-merge
```

## 注意事项

1. **版本兼容**: 确保 React 版本 >= 18.2.0
2. **TypeScript**: 确保已安装 TypeScript 类型定义
3. **Tailwind CSS**: 确保 tailwindcss 已正确配置

---

## tsconfig.json 更新

确保 `tsconfig.json` 包含以下路径配置:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  }
}
```

---

## Vite 配置 (如果使用)

如果使用 Vite,确保 `vite.config.ts` 包含:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```
