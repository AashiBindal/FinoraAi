from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

PHASE_STATUSES = ("not_started", "in_progress", "completed")
TASK_STATUSES = ("todo", "in_progress", "done")
TASK_PRIORITIES = ("low", "medium", "high")


class Phase(TimestampMixin, Base):
    __tablename__ = "phases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order: Mapped[int] = mapped_column(Integer, default=0, index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    # When true, status is recalculated from tasks whenever a task changes.
    auto_status: Mapped[bool] = mapped_column(Boolean, default=True)

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="phase", cascade="all, delete-orphan", order_by="Task.id"
    )


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phase_id: Mapped[int | None] = mapped_column(ForeignKey("phases.id", ondelete="CASCADE"), nullable=True, index=True)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="todo", index=True)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)

    phase: Mapped["Phase | None"] = relationship(back_populates="tasks")
