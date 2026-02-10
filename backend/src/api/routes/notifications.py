
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.deps import get_current_user_required, get_db
from src.models.user import User
from src.services.notification_service import NotificationService

router = APIRouter()

# Schemas
class NotificationSchema(BaseModel):
    id: str
    type: str
    title: str
    message: str
    is_read: bool
    related_link: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    data: List[NotificationSchema]
    total: int

# Routes
@router.get("/", response_model=NotificationResponse)
async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前用户的通知列表
    """
    notifications = await NotificationService.get_user_notifications(
        db, 
        current_user.id, 
        limit=limit, 
        unread_only=unread_only
    )
    
    return NotificationResponse(
        data=notifications,
        total=len(notifications) # Note: For pagination we might want a count query, but for now this is fine
    )

@router.post("/{notification_id}/read", response_model=NotificationSchema)
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """
    标记通知为已读
    """
    notification = await NotificationService.mark_as_read(db, notification_id, current_user.id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification

@router.post("/read-all", response_model=dict)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """
    标记所有通知为已读
    """
    count = await NotificationService.mark_all_as_read(db, current_user.id)
    return {"message": "success", "count": count}

@router.delete("/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """
    删除通知
    """
    success = await NotificationService.delete_notification(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"message": "success"}
