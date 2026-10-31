from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import clean_update, get_db
from app.models import Activity, Project
from app.schemas import ActivityRead, ProjectRead, ProjectUpdate
from app.services.activity import log_activity

router = APIRouter(prefix="/project", tags=["project"])


def _get_project(db: Session) -> Project:
    project = db.scalar(select(Project).limit(1))
    if project is None:  # self-heal if the row was deleted
        project = Project(name="AgentForge")
        db.add(project)
        db.commit()
        db.refresh(project)
    return project


@router.get("", response_model=ProjectRead)
def get_project(db: Session = Depends(get_db)):
    return _get_project(db)


@router.patch("", response_model=ProjectRead)
def update_project(payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = _get_project(db)
    changes = clean_update(payload)
    for key, value in changes.items():
        setattr(project, key, value)
    if changes:
        fields = ", ".join(k.replace("_", " ") for k in changes)
        log_activity(db, "project", f"Project updated: {fields}")
    db.commit()
    db.refresh(project)
    return project


@router.get("/activities", response_model=list[ActivityRead])
def list_activities(limit: int = 20, db: Session = Depends(get_db)):
    limit = max(1, min(limit, 200))
    return db.scalars(select(Activity).order_by(Activity.id.desc()).limit(limit)).all()
