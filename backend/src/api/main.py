"""
AI法务智能体系统 - 主入口
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from src.api.routes import api_router
from src.core.config import settings
from src.core.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("🚀 AI法务智能体系统启动中...")
    
    # 初始化数据库
    try:
        await init_db()
        logger.info("✅ 数据库初始化完成")
    except Exception as e:
        logger.warning(f"⚠️ 数据库初始化跳过: {e}")
    
    # 初始化 MCP 客户端服务（加载已配置的 MCP 服务器连接）
    try:
        from src.services.mcp_client_service import mcp_client_service
        await mcp_client_service.initialize()
        logger.info("✅ MCP 客户端服务初始化完成")
    except Exception as e:
        logger.warning(f"⚠️ MCP 客户端初始化跳过: {e}")
    
    # 预加载技能库
    try:
        from src.services.skill_service import skill_service
        skill_service.load_skills()
        logger.info(f"✅ 技能库加载完成: {len(skill_service.skills)} 个技能")
    except Exception as e:
        logger.warning(f"⚠️ 技能库加载跳过: {e}")
    
    logger.info(f"📍 API文档: http://localhost:{settings.BACKEND_PORT}/docs")
    
    yield
    
    # 关闭时
    # 关闭共享 httpx 连接池
    try:
        from src.agents.base import BaseLegalAgent
        await BaseLegalAgent.close_http_client()
        logger.info("已关闭共享 httpx 连接池")
    except Exception as e:
        logger.warning(f"关闭 httpx 连接池失败: {e}")
    
    # 关闭 MCP 连接
    try:
        from src.services.mcp_client_service import mcp_client_service
        await mcp_client_service.close()
        logger.info("已关闭 MCP 连接")
    except Exception as e:
        logger.warning(f"关闭 MCP 连接失败: {e}")
    
    # 关闭事件总线
    try:
        from src.services.event_bus import event_bus
        await event_bus.disconnect()
    except Exception as e:
        logger.warning(f"关闭事件总线失败: {e}")
    
    await close_db()
    logger.info("AI法务智能体系统关闭")


app = FastAPI(
    title="AI Legal Agent API",
    description="AI法务智能体系统 - 基于多智能体协作的超级AI法务系统",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": "AI Legal Agent",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}
