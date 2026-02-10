
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, GUID

if TYPE_CHECKING:
    from src.models.user import User

class Notification(Base, TimestampMixin):
    """系统通知"""
    
    __tablename__ = "notifications"
    
    user_id: Mapped[str] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    type: Mapped[str] = mapped_column(String(50), nullable=False) # urgent, warning, info, success
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    related_link: Mapped[Optional[str]] = mapped_column(String(500))
    
    # 关联
    user: Mapped["User"] = relationship("User", backref="notifications")
