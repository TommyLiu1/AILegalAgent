"""
协作编辑 WebSocket 路由

处理文档协作编辑的 WebSocket 连接
支持：
- 实时协作编辑
- 光标同步
- 评论/批注
- 用户状态同步
"""

import json
import uuid
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.services.collaboration_service import CollaborationService

router = APIRouter()


@router.websocket("/ws/document/{document_id}")
async def document_collaboration_websocket(
    websocket: WebSocket,
    document_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    文档协作 WebSocket 端点

    客户端消息格式：
    {
        "type": "join" | "operation" | "cursor_update" | "comment" | "ping",
        "data": { ... }
    }

    服务端推送格式：
    {
        "type": "init" | "operation" | "cursor_update" | "user_joined" | "user_left" | "comment_added",
        "data": { ... }
    }
    """
    await websocket.accept()
    logger.info(f"协作 WebSocket 连接: doc={document_id}")

    # 生成会话 ID
    session_id = str(uuid.uuid4())

    # 获取用户信息（如果有 token）
    user_id = "anonymous"
    user_name = "匿名用户"

    if token:
        try:
            # TODO: 验证 token 获取用户信息
            # user = await verify_token(token)
            # user_id = user.id
            # user_name = user.name
            pass
        except Exception as e:
            logger.warning(f"Token 验证失败: {e}")

    collaboration_service = CollaborationService(db)

    try:
        # 等待第一条消息（join 消息）
        init_message = await websocket.receive_json()
        init_type = init_message.get("type")
        init_data = init_message.get("data", {})

        if init_type == "join":
            user_id = init_data.get("user_id", user_id)
            user_name = init_data.get("user_name", user_name)

            # 加入文档协作
            result = await collaboration_service.join_document(
                document_id=document_id,
                user_id=user_id,
                user_name=user_name,
                session_id=session_id,
                websocket=websocket,
                initial_content=init_data.get("initial_content", "")
            )

            # 发送初始化数据
            await websocket.send_json({
                "type": "init",
                "data": {
                    "session_id": session_id,
                    "document_id": document_id,
                    **result
                }
            })
        else:
            await websocket.send_json({
                "type": "error",
                "data": {"message": "第一条消息必须是 join 类型"}
            })
            await websocket.close()
            return

        # 消息循环
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            msg_data = message.get("data", {})

            if msg_type == "operation":
                # 处理文档操作
                result = await collaboration_service.handle_operation(
                    document_id=document_id,
                    user_id=user_id,
                    operation={
                        **msg_data,
                        "session_id": session_id
                    }
                )
                await websocket.send_json({
                    "type": "operation_ack",
                    "data": result
                })

            elif msg_type == "cursor_update":
                # 更新光标位置
                await collaboration_service.update_cursor(
                    document_id=document_id,
                    user_id=user_id,
                    position=msg_data.get("position", 0),
                    selection=msg_data.get("selection")
                )

            elif msg_type == "comment":
                # 添加评论
                result = await collaboration_service.add_comment(
                    document_id=document_id,
                    user_id=user_id,
                    user_name=user_name,
                    content=msg_data.get("content", ""),
                    position=msg_data.get("position", {})
                )
                await websocket.send_json({
                    "type": "comment_ack",
                    "data": result
                })

            elif msg_type == "resolve_comment":
                # 解决评论
                result = await collaboration_service.resolve_comment(
                    document_id=document_id,
                    comment_id=msg_data.get("comment_id")
                )
                await websocket.send_json({
                    "type": "resolve_comment_ack",
                    "data": result
                })

            elif msg_type == "save":
                # 保存文档
                result = await collaboration_service.save_document(
                    document_id=document_id,
                    content=msg_data.get("content", "")
                )
                await websocket.send_json({
                    "type": "save_ack",
                    "data": result
                })

            elif msg_type == "ping":
                # 心跳
                await websocket.send_json({
                    "type": "pong",
                    "data": {"timestamp": msg_data.get("timestamp")}
                })

            else:
                logger.warning(f"未知消息类型: {msg_type}")
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": f"未知消息类型: {msg_type}"}
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket 断开: session={session_id}, doc={document_id}")
        await collaboration_service.leave_document(document_id, user_id, session_id)

    except Exception as e:
        logger.error(f"WebSocket 错误: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "data": {"message": str(e)}
            })
        except:
            pass
        await collaboration_service.leave_document(document_id, user_id, session_id)


# ==================== HTTP API (用于非 WebSocket 场景) ====================

@router.post("/document/{document_id}/operations")
async def apply_document_operation(
    document_id: str,
    operation: dict,
    db: AsyncSession = Depends(get_db),
):
    """通过 HTTP 应用文档操作（备用）"""
    service = CollaborationService(db)

    result = await service.handle_operation(
        document_id=document_id,
        user_id=operation.get("user_id", "api"),
        operation=operation
    )

    return result


@router.post("/document/{document_id}/comments")
async def create_document_comment(
    document_id: str,
    comment: dict,
    db: AsyncSession = Depends(get_db),
):
    """创建文档评论"""
    service = CollaborationService(db)

    result = await service.add_comment(
        document_id=document_id,
        user_id=comment.get("user_id", "api"),
        user_name=comment.get("user_name", "API 用户"),
        content=comment.get("content", ""),
        position=comment.get("position", {})
    )

    return result


@router.get("/document/{document_id}/active-users")
async def get_active_users(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """获取文档的活跃用户列表"""
    from src.services.collaboration_service import collaboration_manager

    session = collaboration_manager.get_session(document_id)
    if not session:
        return {"users": []}

    return {
        "users": [u.__dict__ for u in session.get_active_users()]
    }
