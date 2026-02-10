# AI法务智能体系统 - 后端 Dockerfile

FROM python:3.11-bookworm

# 设置工作目录
WORKDIR /app

# 安装系统依赖 (full image usually has build-essential, but we might need curl if not present)
# RUN apt-get update && apt-get install -y \
#     build-essential \
#     curl \
#     && rm -rf /var/lib/apt/lists/*

# 安装uv
RUN pip install uv

# 复制依赖文件
COPY pyproject.toml README.md ./

# 安装Python依赖
# 增加超时时间设置 UV_HTTP_TIMEOUT=300
RUN UV_HTTP_TIMEOUT=300 uv pip install --system -e .

# 复制源代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# 启动命令
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8001"]
