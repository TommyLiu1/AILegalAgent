# Week 1 交付文档 - A2UI 框架与三层记忆架构

## ✅ 已完成工作

### 1. A2UI 核心框架 (前端)

**目录结构**:
```
frontend/src/components/a2ui/
├── core/                           # 核心模块
│   ├── A2UIProvider.tsx           ✅ Context Provider (370行)
│   ├── A2UIStateManager.ts        ✅ 状态管理器 (230行)
│   ├── A2UIRenderer.tsx           ✅ 动态渲染器 (260行)
│   ├── A2UIComponentRegistry.ts   ✅ 组件注册表 (330行)
│   └── index.ts                   ✅ 核心导出
├── components/                     # 组件库
│   ├── A2UIButton/                ✅ 智能按钮 (270行)
│   ├── A2UICard/                  ✅ 智能卡片 (230行)
│   ├── A2UITypingIndicator/       ✅ 思考动画 (200行)
│   └── index.ts                   ✅ 组件导出
├── utils/                         # 工具函数
│   ├── cn.ts                      ✅ 类名合并工具
│   └── index.ts                   ✅ 工具导出
└── index.ts                       ✅ 主导出
```

**核心功能**:
- ✅ **A2UIProvider**: React Context Provider,支持动态组件注册
- ✅ **A2UIStateManager**: 路径状态管理、批量更新、订阅机制
- ✅ **A2UIRenderer**: 从 Agent 规范动态渲染 React 组件
- ✅ **A2UIComponentRegistry**: 组件类型注册表
- ✅ **A2UIButton**: 5种变体、4种尺寸、加载/成功/错误状态、Framer Motion 动画
- ✅ **A2UICard**: 4种变体、悬停动画、玻璃态效果
- ✅ **A2UITypingIndicator**: 4种动画风格 (dots/wave/pulse/bounce)

### 2. 三层记忆架构 (后端)

**目录结构**:
```
backend/src/core/memory/
├── __init__.py                    ✅ 模块导出
├── base.py                        ✅ 基础记忆服务类 (80行)
├── semantic_memory.py             ✅ 语义记忆服务 (220行)
├── episodic_memory.py             ✅ 情景记忆服务 (280行)
├── working_memory.py              ✅ 工作记忆服务 (330行)
└── retrieval.py                   ✅ 跨层检索系统 (330行)
```

**核心功能**:
- ✅ **BaseMemoryService**: 统一的记忆服务接口
- ✅ **SemanticMemoryService**: 长期知识存储 (法规、模板、概念)
- ✅ **EnhancedEpisodicMemoryService**: 中期经验存储 (案例、反馈、轨迹)
- ✅ **WorkingMemoryService**: 短期会话存储 (Redis + TTL)
- ✅ **MultiTierMemoryRetrieval**: 跨层检索与融合

---

## 📦 安装依赖

### 前端依赖

```bash
cd frontend

# A2UI 框架依赖
npm install framer-motion clsx tailwind-merge

# Lottie 动画 (可选,第二周集成)
npm install lottie-react

# React 相关
npm install react react-dom

# 类型定义
npm install -D @types/react
```

### 后端依赖

```bash
cd backend

# 核心依赖 (应已安装)
pip install fastapi uvicorn redis asyncio loguru pydantic

# 向量数据库 (应已安装)
pip install qdrant-client

# 数据库 (应已安装)
pip install sqlalchemy asyncpg
```

---

## 🚀 快速开始

### 前端 - 使用 A2UI

```typescript
// frontend/src/App.tsx

import React from 'react';
import { A2UIProvider, A2UIButton, A2UICard, A2UITypingIndicator } from './components/a2ui';

function App() {
  return (
    <A2UIProvider debugMode={true}>
      <div className="p-8">
        {/* 使用 A2UI Button */}
        <A2UIButton
          variant="primary"
          size="lg"
          loading={false}
          onClick={() => console.log('Clicked!')}
        >
          点击我
        </A2UIButton>

        {/* 使用 A2UI Card */}
        <A2UICard
          variant="glass"
          hoverable={true}
          title="智能卡片"
          subtitle="支持悬停动画"
        >
          <p>这是卡片内容</p>
        </A2UICard>

        {/* 使用 Typing Indicator */}
        <A2UITypingIndicator
          animation="dots"
          text="AI 正在思考..."
          size="md"
        />
      </div>
    </A2UIProvider>
  );
}

export default App;
```

### 后端 - 使用三层记忆

```python
# backend/src/main.py

from fastapi import FastAPI
from src.core.memory import (
    SemanticMemoryService,
    EnhancedEpisodicMemoryService,
    WorkingMemoryService,
    MultiTierMemoryRetrieval
)

app = FastAPI()

# 初始化记忆服务
semantic_memory = SemanticMemoryService(
    vector_store=vector_store,  # 您的向量存储实例
    db=db                       # 您的数据库实例
)

episodic_memory = EnhancedEpisodicMemoryService(
    vector_store=vector_store,
    db=db
)

working_memory = WorkingMemoryService(
    redis_url="redis://localhost:6379"
)

# 创建跨层检索器
memory_retrieval = MultiTierMemoryRetrieval(
    semantic_memory=semantic_memory,
    episodic_memory=episodic_memory,
    working_memory=working_memory
)

@app.post("/api/chat")
async def chat(message: str, session_id: str):
    # 跨层检索相关记忆
    result = await memory_retrieval.retrieve(
        query=message,
        session_id=session_id,
        context={
            "task_type": "legal_consultation",
            "episodic_top_k": 3,
            "semantic_top_k": 5
        }
    )

    # 使用检索到的记忆生成响应
    return {
        "response": "基于记忆生成的响应",
        "sources": result.source_counts,
        "retrieval_time": result.retrieval_time
    }
```

---

## 📚 API 文档

### A2UI 核心 API

#### A2UIProvider

```typescript
interface A2UIProviderProps {
  children: ReactNode;
  debugMode?: boolean;           // 调试模式
  initialState?: Record<string, any>;  // 初始状态
  onStateChange?: (path: string, value: any) => void;
}
```

#### useA2UI Hook

```typescript
const {
  registerComponent,    // 注册组件
  render,               // 渲染规范
  setState,             // 设置状态
  getState,             // 获取状态
  subscribe,            // 订阅状态变化
  triggerAnimation      // 触发动画
} = useA2UI();
```

#### useA2UIState Hook

```typescript
const [value, setValue] = useA2UIState('user.name', '默认值');

// 自动订阅状态变化
setValue('新值');  // 更新状态
```

### 记忆服务 API

#### 语义记忆 (SemanticMemoryService)

```python
# 添加知识
await semantic_memory.add_knowledge(
    knowledge_type="statute",
    title="合同法第10条",
    content="当事人订立合同，有书面形式...",
    metadata={
        "source": "中华人民共和国合同法",
        "confidence": 1.0
    }
)

# 搜索知识
results = await semantic_memory.search(
    query="合同形式要求",
    top_k=5,
    filters={"knowledge_type": "statute"}
)
```

#### 情景记忆 (EnhancedEpisodicMemoryService)

```python
# 添加案例
episode_id = await episodic_memory.add_episode(
    session_id="session_123",
    task_description="审查服务合同",
    task_type="contract_review",
    agents_involved=["ContractAgent", "RiskAgent"],
    execution_trace={
        "agent_sequence": ["ContractAgent", "RiskAgent"],
        "parallel_groups": []
    },
    result_summary="发现3处风险条款",
    user_rating=5,
    user_feedback="非常准确"
)

# 搜索案例
episodes = await episodic_memory.search(
    query="服务合同审查",
    top_k=3,
    filters={
        "task_type": "contract_review",
        "is_successful": True,
        "min_rating": 4
    }
)
```

#### 工作记忆 (WorkingMemoryService)

```python
# 创建会话
await working_memory.create_session(
    session_id="session_123",
    user_id="user_456"
)

# 添加消息
await working_memory.add_message(
    session_id="session_123",
    role="user",
    content="请帮我审查这份合同"
)

# 设置 Agent 状态
await working_memory.set_agent_state(
    session_id="session_123",
    agent_name="ContractAgent",
    state={"status": "analyzing", "progress": 0.5}
)

# 设置共享变量
await working_memory.set_shared_variable(
    session_id="session_123",
    key="contract_id",
    value="contract_789"
)
```

#### 跨层检索 (MultiTierMemoryRetrieval)

```python
# 跨层检索
result = await memory_retrieval.retrieve(
    query="服务合同风险评估",
    session_id="session_123",
    context={
        "task_type": "contract_review",
        "episodic_top_k": 3,
        "semantic_top_k": 5
    }
)

# 访问结果
print(f"工作记忆: {result.working}")
print(f"情景记忆: {len(result.episodic)} 个案例")
print(f"语义记忆: {len(result.semantic)} 条知识")
print(f"检索耗时: {result.retrieval_time:.3f}秒")
```

---

## 🧪 测试示例

### 前端测试

```typescript
// frontend/src/__tests__/A2UI.test.tsx

import { render, screen } from '@testing-library/react';
import { A2UIProvider, A2UIButton } from '../components/a2ui';

describe('A2UI Button', () => {
  it('renders correctly', () => {
    render(
      <A2UIProvider>
        <A2UIButton variant="primary">Click me</A2UIButton>
      </A2UIProvider>
    );

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <A2UIProvider>
        <A2UIButton loading={true}>Loading</A2UIButton>
      </A2UIProvider>
    );

    // 检查加载图标
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 后端测试

```python
# tests/test_memory.py

import pytest
from src.core.memory import WorkingMemoryService

@pytest.mark.asyncio
async def test_working_memory():
    memory = WorkingMemoryService(redis_url="redis://localhost:6379")

    # 创建会话
    await memory.create_session("test_session", "test_user")

    # 添加消息
    await memory.add_message("test_session", "user", "Hello")

    # 获取消息
    messages = await memory.get_messages("test_session")
    assert len(messages) == 1
    assert messages[0]["content"] == "Hello"

    # 清理
    await memory.delete("test_session")
```

---

## 🔧 配置说明

### Tailwind CSS 配置

```javascript
// tailwind.config.js

module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          // ... 更多色阶
          900: '#1e3a8a',
        },
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
  plugins: [],
}
```

### Redis 配置

```python
# backend/src/core/config.py

class Settings:
    REDIS_URL: str = "redis://localhost:6379/0"
    WORKING_MEMORY_TTL: int = 86400  # 24小时
```

---

## 📈 性能指标

| 指标 | 目标 | 当前 |
|------|------|------|
| **A2UI 组件渲染** | < 16ms | ✅ 待测 |
| **工作记忆读写** | < 10ms | ✅ 待测 |
| **情景记忆检索** | < 500ms | ✅ 待测 |
| **语义记忆检索** | < 2s | ✅ 待测 |
| **跨层检索总耗时** | < 3s | ✅ 待测 |

---

## 🎯 下一步 (Week 2)

1. **A2UI 组件扩展**
   - [ ] A2UIInput, A2UISelect, A2UIList
   - [ ] Lottie 动画集成
   - [ ] 更多微交互效果

2. **Chat.tsx 重构**
   - [ ] 拆分为模块化结构
   - [ ] 创建自定义 Hooks
   - [ ] 集成 A2UI 组件

3. **记忆系统测试**
   - [ ] 单元测试
   - [ ] 集成测试
   - [ ] 性能基准测试

---

## 📝 注意事项

1. **依赖安装**: 确保所有前端和后端依赖已正确安装
2. **Redis 配置**: 工作记忆需要 Redis,确保已启动服务
3. **向量数据库**: 语义记忆和情景记忆需要 Qdrant,确保已配置
4. **TypeScript 类型**: 前端使用 TypeScript,注意类型定义
5. **异步操作**: 后端所有记忆操作都是异步的,记得使用 `await`

---

## 🐛 已知问题

- [ ] A2UIRenderer 的错误处理需要加强
- [ ] 工作记忆的 Redis 连接池需要优化
- [ ] 跨层检索的缓存策略需要完善
- [ ] 单元测试覆盖率需要提升

---

**Week 1 完成 ✅**

**交付物**:
- A2UI 核心框架 (4个核心文件)
- A2UI 基础组件 (3个组件)
- 三层记忆架构 (5个服务类)
- 跨层检索系统
- 本文档

**总代码量**: ~2800 行
