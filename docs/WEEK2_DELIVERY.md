# Week 2 交付文档 - Chat 模块化重构 + A2UI 组件扩展

## ✅ 已完成工作

### 1. Chat Hooks 模块化 (5个核心 Hooks)

**目录结构**:
```
frontend/src/hooks/
├── useChatHistory.ts       ✅ 消息历史管理 (180行)
├── useChatWebSocket.ts     ✅ WebSocket 连接管理 (170行)
├── useChatInput.ts         ✅ 输入框和文件上传 (160行)
├── useChatScroll.ts        ✅ 智能滚动控制 (90行)
├── useWorkspace.ts         ✅ 工作台状态管理 (130行)
└── index.ts                ✅ Hooks 导出
```

**核心功能**:

| Hook | 职责 | API |
|------|------|-----|
| **useChatHistory** | 消息增删改查、历史加载、反馈提交 | `addMessage`, `updateMessage`, `loadHistory`, `submitFeedback` |
| **useChatWebSocket** | WebSocket 连接、自动重连、消息发送 | `connect`, `disconnect`, `send`, `reconnect` |
| **useChatInput** | 输入框状态、文件上传、自动调整高度 | `handleSend`, `handleKeyPress`, `handleFileSelect`, `autoResize` |
| **useChatScroll** | 智能滚动、用户意图检测 | `scrollToBottom`, `scrollToBottomSmooth` |
| **useWorkspace** | Canvas、工作台、确认回调 | `handleCanvasContentChange`, `handleWorkspaceConfirm` |

---

### 2. A2UI 组件库扩展

**新增组件**:
```
frontend/src/components/a2ui/components/
├── A2UIInput/               ✅ 智能输入框 (140行)
├── A2UIAlert/               ✅ 智能提示组件 (170行)
└── index.ts                 ✅ 更新导出
```

**A2UIInput 特性**:
- 4种变体: `default`, `filled`, `outlined`, `underlined`
- 3种尺寸: `sm`, `md`, `lg`
- 自动调整高度
- 错误/成功提示
- 图标支持

**A2UIAlert 特性**:
- 4种类型: `info`, `success`, `warning`, `error`
- 3种风格: `solid`, `outlined`, `soft`
- 可关闭
- 自定义图标
- 动画效果

---

## 📊 代码统计

| 模块 | 文件数 | 代码行数 |
|------|--------|----------|
| **Chat Hooks** | 5 | ~730 行 |
| **A2UI 组件扩展** | 2 | ~310 行 |
| **总计** | 7 | ~1,040 行 |

---

## 🎯 Chat.tsx 重构效果

### 重构前 (1865 行)
```
Chat.tsx
├── 消息状态管理 (~300 行)
├── WebSocket 连接 (~400 行)
├── 输入处理 (~200 行)
├── 滚动控制 (~150 行)
├── 工作台操作 (~300 行)
├── UI 渲染 (~500 行)
└── 其他功能 (~15 行)
```

### 重构后 (目标 ~300 行主文件 + Hooks)
```
Chat.tsx (主容器)
├── useChatHistory() Hook     → 消息管理
├── useChatWebSocket() Hook   → 连接管理
├── useChatInput() Hook       → 输入处理
├── useChatScroll() Hook      → 滚动控制
├── useWorkspace() Hook       → 工作台操作
└── 子组件渲染
    ├── ChatSidebar           → 侧边栏
    ├── ChatMessages          → 消息列表
    └── ChatInput             → 输入框
```

---

## 📝 使用示例

### 1. 使用 Chat Hooks

```typescript
// frontend/src/pages/Chat.tsx (重构后)

import { useChatHistory, useChatWebSocket, useChatInput, useChatScroll, useWorkspace } from '@/hooks';
import { useRef } from 'react';

export default function Chat() {
  const conversationId = 'conv-123';

  // 消息历史
  const {
    messages,
    addMessage,
    loadHistory,
  } = useChatHistory({ conversationId });

  // WebSocket 连接
  const { isConnected, send, wsRef } = useChatWebSocket(
    { conversationId },
    {
      onMessage: (data) => {
        // 处理 WebSocket 消息
        switch (data.type) {
          case 'content_token':
            // 处理流式内容
            break;
          case 'done':
            // 处理完成
            break;
        }
      },
    }
  );

  // 输入管理
  const {
    input,
    setInput,
    pendingFile,
    handleSend,
    inputRef,
    fileInputRef,
  } = useChatInput({
    onSend: (content, file) => {
      // 发送消息
      send({ content, has_attachments: !!file });
    },
  });

  // 滚动控制
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { userScrolledUp, scrollToBottom } = useChatScroll({
    messagesContainerRef,
    messagesEndRef,
    messages,
    isStreaming: false,
  });

  // 工作台
  const {
    canvasContent,
    handleCanvasContentChange,
    handleWorkspaceConfirm,
  } = useWorkspace({ conversationId, wsRef });

  return (
    <div className="chat-container">
      {/* UI 渲染 */}
    </div>
  );
}
```

### 2. 使用 A2UI 组件

```typescript
import { A2UIInput, A2UIAlert, A2UIButton, A2UICard } from '@/components/a2ui';

function Example() {
  const [value, setValue] = useState('');
  const [alertVisible, setAlertVisible] = useState(true);

  return (
    <div className="space-y-4 p-4">
      {/* Alert */}
      {alertVisible && (
        <A2UIAlert
          type="success"
          title="保存成功"
          message="文档已成功保存到文档库"
          closable
          onClose={() => setAlertVisible(false)}
          variant="soft"
        />
      )}

      {/* Card */}
      <A2UICard
        variant="glass"
        hoverable
        title="智能卡片"
        subtitle="支持悬停动画"
      >
        <p>这是卡片内容</p>
      </A2UICard>

      {/* Input */}
      <A2UIInput
        variant="outlined"
        size="lg"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入内容..."
        autoResize
        minHeight={40}
        maxHeight={120}
      />

      {/* Button */}
      <A2UIButton
        variant="primary"
        size="md"
        onClick={() => console.log('Clicked')}
      >
        提交
      </A2UIButton>
    </div>
  );
}
```

---

## 🔧 安装依赖

```bash
cd frontend

# 确保已安装 Week 1 的依赖
npm install framer-motion clsx tailwind-merge

# 如需 Lottie 动画 (Week 2 后续)
npm install lottie-react
```

---

## 📚 API 参考

### useChatHistory

```typescript
interface UseChatHistoryReturn {
  // 状态
  messages: Message[];
  historyLoaded: boolean;
  isLoadingHistory: boolean;

  // 操作
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  loadHistory: (conversationId: string) => Promise<void>;
  resetToWelcome: () => void;
  submitFeedback: (messageId: string, rating: number) => Promise<boolean>;
}
```

### useChatWebSocket

```typescript
interface UseChatWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  connect: (conversationId: string) => WebSocket | null;
  disconnect: () => void;
  send: (data: any) => boolean;
  reconnect: () => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
}
```

### useChatInput

```typescript
interface UseChatInputReturn {
  input: string;
  setInput: (value: string) => void;
  pendingFile: PendingFile | null;
  sendDisabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSend: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleFileSelect: (file: File) => void;
  clearPendingFile: () => void;
  focusInput: () => void;
  autoResize: () => void;
}
```

### A2UIInput

```typescript
interface A2UIInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'filled' | 'outlined' | 'underlined';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  success?: string;
  icon?: React.ReactNode;
  onIconClick?: () => void;
  autoResize?: boolean;
  minHeight?: number;
  maxHeight?: number;
}
```

### A2UIAlert

```typescript
interface A2UIAlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  closable?: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
  variant?: 'solid' | 'outlined' | 'soft';
}
```

---

## 🎯 下一步 (Week 2 后续)

| 优先级 | 任务 | 预计时间 |
|--------|------|----------|
| **P0** | Chat.tsx 主文件重构 (使用 Hooks) | 2小时 |
| **P1** | 拆分 ChatMessages 组件 | 1.5小时 |
| **P1** | 拆分 ChatInput 组件 | 1小时 |
| **P1** | 拆分 ChatSidebar 组件 | 1.5小时 |
| **P2** | 集成 Lottie 动画 | 1小时 |
| **P2** | 单元测试 | 2小时 |

---

## ⚠️ 注意事项

1. **Hooks 依赖**: 确保 `@/lib/api` 和 `@/lib/store` 已正确导出
2. **TypeScript**: 所有 Hooks 都有完整的类型定义
3. **Ref 管理**: WebSocket Ref 需要跨组件共享,注意生命周期
4. **错误处理**: WebSocket 断线需要显示用户友好的提示
5. **性能优化**: 使用 `useCallback` 和 `useMemo` 避免不必要的重渲染

---

## 🐛 已知问题

- [ ] useChatInput 中的 `setUserScrolledUp` 需要从 useChatScroll 传递
- [ ] Canvas 防抖保存可能需要调整延迟时间
- [ ] WebSocket 重连策略可能需要优化 (指数退避)

---

## 📈 进度总结

### Week 1 + Week 2 完成情况

| 阶段 | 状态 | 交付物 |
|------|------|--------|
| **Week 1** | ✅ 完成 | A2UI 核心框架 + 三层记忆架构 |
| **Week 2 (进行中)** | 🟡 70% | Chat Hooks + A2UI 组件扩展 |
| **Week 2 (待完成)** | ⏳ 30% | Chat.tsx 重构 + 组件拆分 + Lottie |

---

**Week 2 (部分) 完成！** 🚀

已完成 5 个核心 Hooks 和 2 个 A2UI 组件,为 Chat.tsx 重构打下基础。

**总代码量**: ~4,110 行 (Week 1: 3,070 + Week 2: 1,040)
