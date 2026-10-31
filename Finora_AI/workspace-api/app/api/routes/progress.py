from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import ProgressSummary
from app.services.progress import compute_summary

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=ProgressSummary)
def get_progress(db: Session = Depends(get_db)):
    """All progress numbers, calculated live from task rows."""
    return compute_summary(db)
