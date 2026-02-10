
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from src.models.notification import Notification

class NotificationService:
    @staticmethod
    async def create_notification(
        session: AsyncSession,
        user_id: str,
        type: str,
        title: str,
        message: str,
        related_link: Optional[str] = None
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_link=related_link,
            is_read=False
        )
        session.add(notification)
        await session.commit()
        await session.refresh(notification)
        return notification

    @staticmethod
    async def get_user_notifications(
        session: AsyncSession,
        user_id: str,
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Notification]:
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
            
        query = query.order_by(Notification.created_at.desc()).limit(limit)
        
        result = await session.execute(query)
        return result.scalars().all()

    @staticmethod
    async def mark_as_read(
        session: AsyncSession,
        notification_id: str,
        user_id: str
    ) -> Optional[Notification]:
        query = (
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
            .returning(Notification)
        )
        result = await session.execute(query)
        await session.commit()
        return result.scalar_one_or_none()

    @staticmethod
    async def mark_all_as_read(
        session: AsyncSession,
        user_id: str
    ) -> int:
        query = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        result = await session.execute(query)
        await session.commit()
        return result.rowcount
    
    @staticmethod
    async def delete_notification(
        session: AsyncSession,
        notification_id: str,
        user_id: str
    ) -> bool:
        query = delete(Notification).where(
            Notification.id == notification_id, 
            Notification.user_id == user_id
        )
        result = await session.execute(query)
        await session.commit()
        return result.rowcount > 0
