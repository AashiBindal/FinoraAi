from sqlalchemy.orm import Session

from app.models import Activity


def log_activity(db: Session, kind: str, message: str, commit: bool = False) -> Activity:
    """Append an entry to the activity feed. Caller usually commits."""
    entry = Activity(kind=kind, message=message[:500])
    db.add(entry)
    if commit:
        db.commit()
    return entry
