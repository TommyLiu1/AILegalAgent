"""
API路由汇总
"""

from fastapi import APIRouter

from src.api.routes import auth, chat, cases, contracts, documents, due_diligence, knowledge, llm, lic, assets, notifications
from src.api.routes import sentiment, collaboration, collaboration_ws, integrations, datacenter
from src.api.routes import mcp_routes, episodic_memory

api_router = APIRouter()

# 注册各模块路由
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI对话"])
api_router.include_router(cases.router, prefix="/cases", tags=["案件管理"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["合同审查"])
api_router.include_router(documents.router, prefix="/documents", tags=["文档管理"])
api_router.include_router(due_diligence.router, prefix="/due-diligence", tags=["尽职调查"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["知识库"])
api_router.include_router(llm.router, prefix="/llm", tags=["LLM配置"])
api_router.include_router(sentiment.router, prefix="/sentiment", tags=["舆情监控"])
api_router.include_router(collaboration.router, prefix="/collaboration", tags=["协作编辑"])
api_router.include_router(collaboration_ws.router, prefix="/collaboration", tags=["协作编辑-WebSocket"])
api_router.include_router(lic.router, prefix="/lic", tags=["LIC抓取"])
api_router.include_router(assets.router, prefix="/assets", tags=["资产管理"])
api_router.include_router(mcp_routes.router, prefix="/mcp", tags=["MCP服务"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["通知中心"])
api_router.include_router(integrations.router, prefix="/integrations/oa", tags=["OA集成"])
api_router.include_router(datacenter.router, prefix="/datacenter", tags=["企业数据中心"])
api_router.include_router(episodic_memory.router, prefix="/knowledge-center", tags=["知识中心"])
