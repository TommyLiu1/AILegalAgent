# AI法务智能体系统 (AI Legal Agent)

<div align="center">

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)
![FastAPI](https://img.shields.io/badge/fastapi-0.109+-green.svg)

**基于多智能体协作与自我进化机制的下一代 AI 法务系统**

</div>

## 项目简介

AI法务智能体系统是一个基于 **Multi-Agent 协作** 与 **自我进化架构** 构建的智能法务平台。它不仅能通过多个专业化智能体（合同审查、尽职调查、法律顾问等）协同工作，还具备**情景记忆**与**动态技能**能力，能够从历史交互中学习，越用越聪明。

## 核心特性 (v2.0 升级版)

### 🧠 1. 核心架构升级
- **意图路由 (Intent Routing)**: 智能识别用户需求是“简单咨询”还是“复杂案件”。简单问题直通法律顾问，复杂问题自动生成 DAG 执行计划。
- **异步事件总线 (Event Bus)**: 基于 Redis 的实时消息架构，支持 Agent 状态广播（思考中、工具调用中...），前端实时感知。
- **技能热加载 (Skill Hot-Loading)**: 支持通过 `skills/` 目录下的 Markdown 文件动态扩展 Agent 能力，无需重启服务即可掌握新法条或审查规则。

### 💾 2. 自我进化机制
- **情景记忆 (Episodic Memory)**: 系统会自动将历史案件的任务、计划和结果存入 Qdrant 向量库。
- **经验复用**: 当遇到类似案件时，自动检索高分历史经验，复用成功的执行路径。
- **反馈闭环 (RLHF-lite)**: 支持用户对执行结果打分（👍/👎），系统根据反馈调整记忆权重，自动过滤错误经验。

### 💼 3. 专业法务能力
- 🤖 **多智能体协作** - 9个专业法务智能体协同工作
- 📝 **智能合同审查** - 自动识别风险条款，提供修改建议
- 🔍 **尽职调查** - 企业背景深度调查与信用评估
- 📚 **法律知识库** - 法规、判例 RAG 智能检索
- 📄 **文书智能生成** - 法律文书自动起草与在线编辑
- ⚖️ **案件全流程管理** - 案件立案、进度追踪、律师交接简报

### 🛠️ 4. 实用工具箱 (New)
- 🧮 **法务计算器**: 内置诉讼费计算（支持简易程序减半）、利息/违约金计算、期限日期计算器。
- 🏢 **税务与资产分析**: 
  - 企业资产登记与管理
  - 交易税费智能测算（房地产/股权）
  - 破产清算偿债模拟

## 智能体团队

| 智能体 | 角色 | 职责 |
|--------|------|------|
| **协调调度Agent** | 大脑/PM | 意图识别、DAG 任务编排、结果汇总 |
| **法律顾问Agent** | 首席顾问 | 通用法律咨询、快速响应 |
| **合同审查Agent** | 合同专家 | 条款审查、风险识别 |
| **尽职调查Agent** | 调查专家 | 企业背景调查、信息收集 |
| **法规研究Agent** | 研究员 | 法律法规检索、判例分析 |
| **文书起草Agent** | 文书专家 | 法律文书智能生成 |
| **合规审核Agent** | 合规官 | 业务流程合规检查 |
| **风险评估Agent** | 风控专家 | 法律风险综合评分 |
| **共识决策Agent** | 仲裁者 | 处理多 Agent 意见分歧 |

## 快速开始

### 方式一：一键启动 (Windows 推荐)

直接运行项目根目录下的脚本：
```bash
start_dev.bat
```
该脚本会自动：
1. 检查并启动 Docker 环境 (PostgreSQL, Redis, Qdrant, Neo4j)
2. 启动 Backend 服务 (localhost:8001)
3. 启动 Frontend 服务 (localhost:3000)

### 方式二：手动启动

#### 1. 启动基础设施
```bash
# 启动数据库、向量库、Redis
docker-compose up -d postgres redis qdrant
```

#### 2. 后端配置与启动
```bash
cd backend

# 配置环境变量
copy .env.example .env
# 编辑 .env 填入 LLM_API_KEY 等信息

# 安装依赖
pip install uv && uv sync

# 数据库迁移与初始化
uv run alembic upgrade head
python scripts/init_db.py

# (可选) 填充测试数据
python scripts/seed_cases.py

# 启动服务
uv run uvicorn src.api.main:app --reload --port 8001
```

#### 3. 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 | 默认账号 |
|------|------|----------|
| 前端 | http://localhost:3000 | `admin@example.com` / `admin123` |
| 后端API | http://localhost:8001 | - |
| API文档 | http://localhost:8001/docs | - |

## 目录结构

```
ai-legal-agent/
├── backend/
│   ├── src/
│   │   ├── agents/              # 智能体核心逻辑
│   │   ├── services/
│   │   │   ├── event_bus.py     # [New] 事件总线
│   │   │   ├── episodic_memory_service.py # [New] 情景记忆服务
│   │   └── api/                 # FastAPI 接口
│   └── scripts/                 # 初始化与测试脚本
│       ├── seed_cases.py        # 填充测试数据
│       └── test_full_flow.py    # 全流程自动化测试
│
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LegalTools.tsx   # [New] 法务工具箱
│   │   │   ├── TaxAssets.tsx    # [New] 税务资产分析
│   │   └── components/
└── skills/                      # [New] 动态技能库 (Markdown定义)
    ├── contract-review/
    └── ...
```

## 许可证
Apache 2.0
