# AI Legal Agent 部署指南

本文档提供 AI Legal Agent 系统的完整部署指南，包括环境准备、服务部署、配置管理、监控运维等内容。

---

## 目录

- [系统架构](#系统架构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细部署](#详细部署)
- [配置管理](#配置管理)
- [安全加固](#安全加固)
- [监控运维](#监控运维)
- [备份恢复](#备份恢复)
- [故障排查](#故障排查)

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Legal Agent                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   Frontend       │         │    Backend       │          │
│  │   (React/Vite)   │◄────────┤   (FastAPI)      │          │
│  │   Port: 3000     │         │   Port: 8001     │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                         │                     │
│                          ┌──────────────┼──────────────┐     │
│                          ▼              ▼              ▼     │
│                   ┌──────────┐   ┌──────────┐   ┌─────────┐│
│                   │PostgreSQL│   │  Redis   │   │ Qdrant  ││
│                   │  :5432   │   │  :6379   │   │  :6333  ││
│                   └──────────┘   └──────────┘   └─────────┘│
│                                                               │
│                   ┌──────────┐   ┌──────────┐                │
│                   │  Neo4j   │   │  MinIO   │                │
│                   │  :7687   │   │  :9000   │                │
│                   └──────────┘   └──────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 环境要求

### 硬件要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 4 核 | 8 核+ |
| 内存 | 8 GB | 16 GB+ |
| 存储 | 50 GB SSD | 200 GB SSD |
| 网络 | 100 Mbps | 1 Gbps |

### 软件要求

| 软件 | 版本 |
|------|------|
| Python | 3.10+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |
| Redis | 7+ |
| Qdrant | 1.7+ |
| Neo4j | 5+ |
| MinIO | RELEASE.2023+ |

---

## 快速开始

### 1. 使用 Docker Compose (推荐)

```bash
# 克隆项目
git clone <repository-url>
cd ai-legal-agent

# 启动所有服务
docker-compose up -d

# 等待服务启动
docker-compose ps

# 初始化数据库
docker-compose exec backend python -m alembic upgrade head

# 访问应用
# Frontend: http://localhost:3000
# Backend API: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### 2. 手动部署

参考[详细部署](#详细部署)章节。

---

## 详细部署

### 1. 数据库部署

#### PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE legal_agent_db;
CREATE USER legal_agent WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE legal_agent_db TO legal_agent;
\q
```

#### Redis

```bash
# Ubuntu/Debian
sudo apt install redis-server

# 配置密码
sudo nano /etc/redis/redis.conf
# 设置: requirepass your_redis_password

# 重启服务
sudo systemctl restart redis-server
```

#### Qdrant

```bash
# 使用 Docker
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v /path/to/qdrant/storage:/qdrant/storage \
  qdrant/qdrant:latest

# 或使用二进制
curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-linux-x86_64.tar.gz | tar xz
./qdrant
```

#### Neo4j

```bash
# 使用 Docker
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  -v /path/to/neo4j/data:/data \
  neo4j:latest
```

#### MinIO

```bash
# 使用 Docker
docker run -d \
  --name minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=secure_password \
  -v /path/to/minio/data:/data \
  minio/minio server /data --console-address ":9001"
```

---

### 2. 后端部署

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
nano .env
# 编辑以下配置:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET_KEY (生产环境必须使用强密钥)
# - LLM_API_KEY
# - QDRANT_URL
# - NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
# - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY

# 运行数据库迁移
python -m alembic upgrade head

# 启动服务 (开发模式)
uvicorn src.main:app --reload --port 8001

# 启动服务 (生产模式)
uvicorn src.main:app --host 0.0.0.0 --port 8001 --workers 4
```

---

### 3. 前端部署

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
nano .env.local
# 编辑 API_URL

# 开发模式
npm run dev

# 生产构建
npm run build

# 使用 Nginx 部署
sudo cp -r dist /var/www/legal-agent
sudo nano /etc/nginx/sites-available/legal-agent
```

Nginx 配置示例:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/legal-agent;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置:

```bash
sudo ln -s /etc/nginx/sites-available/legal-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 4. 使用 systemd 管理

创建服务文件 `/etc/systemd/system/legal-agent-backend.service`:

```ini
[Unit]
Description=AI Legal Agent Backend
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/backend/.venv/bin"
EnvironmentFile=/path/to/backend/.env
ExecStart=/path/to/backend/.venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务:

```bash
sudo systemctl daemon-reload
sudo systemctl enable legal-agent-backend
sudo systemctl start legal-agent-backend
sudo systemctl status legal-agent-backend
```

---

## 配置管理

### 环境变量配置

创建 `.env` 文件:

```bash
# ========== 基础配置 ==========
APP_NAME=AI Legal Agent
ENVIRONMENT=production  # development, staging, production
DEBUG=false

# ========== 数据库 ==========
DATABASE_URL=postgresql://user:password@localhost:5432/legal_agent_db
DATABASE_POOL_SIZE=10

# ========== Redis ==========
REDIS_URL=redis://localhost:6379/0

# ========== JWT ==========
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE_MINUTES=1440

# ========== LLM ==========
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o

# ========== Qdrant ==========
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-api-key

# ========== Neo4j ==========
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# ========== MinIO ==========
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=your-password
MINIO_BUCKET=legal-documents
```

---

## 安全加固

### 1. 更改默认密码

```bash
# PostgreSQL
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'strong_password';

# Redis
sudo nano /etc/redis/redis.conf
# 设置 requirepass

# Neo4j
# 在 docker-compose 或启动命令中设置
```

### 2. 启用 HTTPS (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 配置防火墙

```bash
# UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 4. 限制 API 访问

在 `src/core/config.py` 中配置 CORS:

```python
CORS_ORIGINS = [
    "https://your-domain.com",
    "https://www.your-domain.com"
]
```

---

## 监控运维

### 1. 健康检查端点

```bash
# 后端健康检查
curl http://localhost:8001/health

# 数据库连接检查
curl http://localhost:8001/health/db

# Redis 连接检查
curl http://localhost:8001/health/redis
```

### 2. 日志管理

日志位置:
- 后端: `backend/logs/`
- Nginx: `/var/log/nginx/`
- Systemd: `journalctl -u legal-agent-backend`

查看日志:

```bash
# 实时查看后端日志
tail -f backend/logs/app.log

# 查看 systemd 日志
journalctl -u legal-agent-backend -f

# 查看 Nginx 日志
tail -f /var/log/nginx/access.log
```

### 3. 性能监控

推荐工具:
- **Prometheus + Grafana**: 指标收集和可视化
- **Sentry**: 错误追踪
- **New Relic / Datadog**: APM 监控

### 4. 缓存监控

```bash
# Redis 监控
redis-cli INFO stats

# 缓存命中率
redis-cli INFO | grep keyspace_hits
```

---

## 备份恢复

### 1. 数据库备份

```bash
# PostgreSQL 备份
pg_dump -U legal_agent legal_agent_db > backup_$(date +%Y%m%d).sql

# 恢复
psql -U legal_agent legal_agent_db < backup_20231201.sql
```

### 2. 向量数据备份 (Qdrant)

```bash
# Qdrant 快照
curl -X POST http://localhost:6333/collections/legal_knowledge/snapshots

# 下载快照
curl http://localhost:6333/collections/legal_knowledge/snapshots/download
```

### 3. 文件备份 (MinIO)

```bash
# 使用 mc (MinIO Client)
mc alias set local http://localhost:9000 admin password
mc mirror local/backup /path/to/backup
```

### 4. 自动备份脚本

创建 `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL
pg_dump -U legal_agent legal_agent_db > $BACKUP_DIR/db_$DATE.sql

# Redis
redis-cli --rdb $BACKUP_DIR/redis_$DATE.rdb

# MinIO
mc mirror local/ $BACKUP_DIR/minio_$DATE/

# 保留最近 7 天的备份
find $BACKUP_DIR -mtime +7 -delete
```

设置定时任务:

```bash
# 每天凌晨 2 点执行
crontab -e
0 2 * * * /path/to/backup.sh
```

---

## 故障排查

### 常见问题

#### 1. 后端启动失败

```bash
# 检查日志
journalctl -u legal-agent-backend -n 50

# 常见原因:
# - 端口被占用: lsof -i :8001
# - 数据库连接失败: ping localhost, 检查 PostgreSQL 状态
# - 环境变量缺失: 检查 .env 文件
```

#### 2. 数据库迁移失败

```bash
# 检查当前版本
python -m alembic current

# 查看迁移历史
python -m alembic history

# 强制回滚
python -m alembic downgrade base
```

#### 3. Redis 连接失败

```bash
# 检查 Redis 状态
sudo systemctl status redis-server

# 测试连接
redis-cli ping

# 检查配置
redis-cli CONFIG GET requirepass
```

#### 4. Qdrant 性能问题

```bash
# 查看集合信息
curl http://localhost:6333/collections/legal_knowledge

# 优化索引
curl -X PUT http://localhost:6333/collections/legal_knowledge/index \
  -H 'Content-Type: application/json' \
  -d '{
    "field_name": "vector",
    "field_type": "vector",
    "metric_type": "Cosine"
  }'
```

---

## 生产环境检查清单

部署前检查:

- [ ] 更改所有默认密码
- [ ] 设置强 JWT_SECRET_KEY
- [ ] 配置正确的 CORS 源
- [ ] 启用 HTTPS
- [ ] 配置防火墙规则
- [ ] 设置日志轮转
- [ ] 配置自动备份
- [ ] 配置监控告警
- [ ] 运行安全扫描
- [ ] 压力测试验证

---

## 支持

如有问题，请:

1. 查看本文档的[故障排查](#故障排查)章节
2. 查看项目 Issues
3. 联系技术支持

---

**文档版本**: 1.0.0
**最后更新**: 2024-01-18
