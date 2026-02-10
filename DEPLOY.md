# AI法务智能体系统 - 部署与运行指南

## 1. 环境准备

确保您的系统已安装以下软件：
- **Python 3.11+**
- **Node.js 18+**
- **Docker & Docker Compose** (用于运行数据库和中间件)

## 2. 快速初始化

我们提供了一键初始化脚本，自动配置环境并安装依赖。

### Windows
双击运行 `setup.bat`。

该脚本会执行以下操作：
1. 检查 Python 和 Node.js 环境。
2. 创建后端 `.env` 配置文件（自动修正数据库端口为 5433）。
3. 创建 Python 虚拟环境 (`.venv`) 并安装所有依赖。
4. 安装前端 `npm` 依赖。

## 3. 启动服务

### Windows
双击运行 `start-all.bat`。

该脚本会：
1. 启动 Docker 容器 (PostgreSQL, Redis, Qdrant, Neo4j, MinIO)。
2. 在新窗口启动后端 API 服务 (`http://localhost:8001`)。
3. 在新窗口启动前端 React 应用 (`http://localhost:3000`)。

## 4. 验证系统

1. **访问前端**: 打开浏览器访问 `http://localhost:3000`。
2. **访问 API 文档**: 打开 `http://localhost:8001/docs`。
3. **数据库连接**:
   - PostgreSQL 端口: 5433 (默认用户: postgres / 密码: password)
   - Redis 端口: 6379
   - Qdrant 面板: `http://localhost:6333/dashboard`
   - MinIO 控制台: `http://localhost:9001` (用户: admin / 密码: password)

## 5. 常见问题

**Q: 启动后端时提示 `ModuleNotFoundError`？**
A: 请确保您已运行 `setup.bat` 成功安装依赖。如果问题依旧，请尝试手动激活虚拟环境并安装：
```bash
cd backend
.venv\Scripts\activate
pip install -r pyproject.toml
```

**Q: 安装依赖时 `tiktoken` 报错 "can't find Rust compiler"？**
A: 这是因为您可能使用的是 Python 3.13，而部分依赖库请求了旧版 tiktoken。请手动安装最新版 tiktoken：
```bash
cd backend
.venv\Scripts\activate
pip install "tiktoken>=0.12.0"
pip install -e .
```

**Q: 数据库连接失败？**
A: 检查 Docker 容器是否运行正常 (`docker ps`)。确保 `.env` 文件中的 `DATABASE_URL` 端口是 `5433` (因为 Docker 映射了 5433:5432 以避免端口冲突)。

**Q: 智能体无法回答问题？**
A: 请检查 `backend/.env` 文件中的 `LLM_API_KEY` 是否已正确配置。默认配置使用的是 DeepSeek API，您可以根据需要修改为 OpenAI 或其他提供商。
