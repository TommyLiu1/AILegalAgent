"""

???????

"""



from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Boolean

from sqlalchemy.orm import Mapped, mapped_column, relationship



from src.models.base import Base, TimestampMixin, GUID



if TYPE_CHECKING:

    from src.models.case import Case

    from src.models.document import Document

    from src.models.sentiment import SentimentRecord, SentimentAlert, SentimentMonitor





class Organization(Base, TimestampMixin):

    """??/????"""

    

    __tablename__ = "organizations"

    

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[Optional[str]] = mapped_column(String(1000))

    logo_url: Mapped[Optional[str]] = mapped_column(String(500))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    

    # ??

    users: Mapped[list["User"]] = relationship("User", back_populates="organization")

    cases: Mapped[list["Case"]] = relationship("Case", back_populates="organization")

    # ????

    sentiment_records: Mapped[list["SentimentRecord"]] = relationship(

        "SentimentRecord", back_populates="organization"

    )

    sentiment_alerts: Mapped[list["SentimentAlert"]] = relationship(

        "SentimentAlert", back_populates="organization"

    )

    sentiment_monitors: Mapped[list["SentimentMonitor"]] = relationship(

        "SentimentMonitor", back_populates="organization"

    )





class User(Base, TimestampMixin):

    """????"""

    

    __tablename__ = "users"

    

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))

    role: Mapped[str] = mapped_column(String(50), default="member")  # admin, member, viewer

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    

    # ??

    org_id: Mapped[Optional[str]] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="SET NULL")
    )

    

    # ??

    organization: Mapped[Optional["Organization"]] = relationship(

        "Organization", back_populates="users"

    )

    created_cases: Mapped[list["Case"]] = relationship(

        "Case", back_populates="creator", foreign_keys="Case.created_by"

    )

    assigned_cases: Mapped[list["Case"]] = relationship(

        "Case", back_populates="assignee", foreign_keys="Case.assignee_id"

    )

    documents: Mapped[list["Document"]] = relationship(

        "Document", back_populates="created_by_user"

    )

