# AI Legal Agent MCP Server

本模块提供了 Model Context Protocol (MCP) 支持，允许外部 AI 助手（如 Claude Desktop）直接与 AI 法务智能体系统交互。

## 功能

通过 MCP 协议，您可以直接在 Claude 中：
- 🔍 **搜索法律知识库**：查询法律法规、案例和内部文档
- 📊 **查看案件列表**：获取当前待办和进行中的案件
- 📑 **获取案件详情**：查看特定案件的详细信息和 AI 分析报告
- 🧠 **触发 AI 分析**：对指定案件运行深度 AI 分析

## 安装与配置

### 1. 确保依赖已安装

项目已包含 `mcp` 依赖。如果没有安装，请运行：

```bash
cd backend
uv sync
```

### 2. 配置 Claude Desktop

编辑 Claude Desktop 的配置文件（通常位于 `%APPDATA%\Claude\claude_desktop_config.json`），添加以下配置：

```json
{
  "mcpServers": {
    "ai-legal-agent": {
      "command": "uv",
      "args": [
        "run",
        "python",
        "-m",
        "src.mcp_server"
      ],
      "cwd": "C:\\Users\\Administrator\\Desktop\\20260118AI-Legal-Agent\\ai-legal-agent\\backend",
      "env": {
        "PYTHONUTF8": "1"
      }
    }
  }
}
```

> 注意：请根据您的实际项目路径修改 `cwd`。

### 3. 运行测试

您也可以使用提供的批处理文件直接运行服务器（仅用于测试，Claude Desktop 会自动后台运行）：

```bash
start_mcp.bat
```

## 可用工具 (Tools)

- `search_knowledge_base`: 搜索法律知识库
- `list_pending_cases`: 列出待处理案件
- `get_case_details`: 获取案件详情
- `analyze_legal_case`: 触发案件 AI 分析

## 可用资源 (Resources)

- `legal://cases/list`: 案件列表摘要
- `legal://knowledge/stats`: 知识库统计信息
