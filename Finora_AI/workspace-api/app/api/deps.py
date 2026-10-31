"""Shared FastAPI dependencies and helpers for routes."""

from typing import TypeVar

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import NotFoundError

T = TypeVar("T")

__all__ = ["clean_update", "get_db", "get_or_404"]


def get_or_404(db: Session, model: type[T], obj_id: int, label: str | None = None) -> T:
    obj = db.get(model, obj_id)
    if obj is None:
        raise NotFoundError(f"{label or model.__name__} {obj_id} not found")
    return obj


def clean_update(payload, nullable: frozenset[str] = frozenset()) -> dict:
    """Fields the client actually sent, minus `null`s for columns that can't be null."""
    return {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or k in nullable}
