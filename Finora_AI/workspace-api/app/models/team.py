from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class TeamMember(TimestampMixin, Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(120), default="")
    responsibilities: Mapped[str] = mapped_column(Text, default="")
    email: Mapped[str] = mapped_column(String(160), default="")
    github: Mapped[str] = mapped_column(String(120), default="")
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
