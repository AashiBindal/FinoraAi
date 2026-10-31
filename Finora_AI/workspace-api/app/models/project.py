from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, utcnow


class Project(TimestampMixin, Base):
    """Single-row table holding the editable project definition.

    The overview fields start empty / placeholder until the hackathon
    problem statement is announced. List-like fields (key_features,
    objectives, target_users) are stored as newline-separated text.
    """

    __tablename__ = "project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="AgentForge")
    tagline: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    hackathon_name: Mapped[str] = mapped_column(String(160), default="")
    problem_statement: Mapped[str] = mapped_column(Text, default="")
    target_users: Mapped[str] = mapped_column(Text, default="")
    proposed_solution: Mapped[str] = mapped_column(Text, default="")
    key_features: Mapped[str] = mapped_column(Text, default="")
    expected_impact: Mapped[str] = mapped_column(Text, default="")
    objectives: Mapped[str] = mapped_column(Text, default="")
    demo_date: Mapped[str] = mapped_column(String(32), default="")


class DocSection(TimestampMixin, Base):
    __tablename__ = "doc_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    content: Mapped[str] = mapped_column(Text, default="")
    order: Mapped[int] = mapped_column(Integer, default=0)


class Integration(TimestampMixin, Base):
    """A planned or connected external integration (model, API, DB, service)."""

    __tablename__ = "integrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    layer: Mapped[str] = mapped_column(String(40), default="tools")  # frontend|backend|database|agent|tools
    status: Mapped[str] = mapped_column(String(20), default="planned")  # planned|in_progress|connected
    description: Mapped[str] = mapped_column(Text, default="")
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)


class Activity(Base):
    """Append-only activity feed shown on the dashboard."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(40))  # task|phase|project|team|docs|agent|system
    message: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
