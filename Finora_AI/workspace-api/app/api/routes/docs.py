from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import clean_update, get_db
from app.core.errors import NotFoundError
from app.models import DocSection
from app.schemas import DocSectionRead, DocSectionUpdate
from app.services.activity import log_activity

router = APIRouter(prefix="/docs", tags=["documentation"])


@router.get("", response_model=list[DocSectionRead])
def list_sections(db: Session = Depends(get_db)):
    return db.scalars(select(DocSection).order_by(DocSection.order)).all()


@router.get("/{slug}", response_model=DocSectionRead)
def get_section(slug: str, db: Session = Depends(get_db)):
    section = db.scalar(select(DocSection).where(DocSection.slug == slug))
    if section is None:
        raise NotFoundError(f"Doc section '{slug}' not found")
    return section


@router.patch("/{slug}", response_model=DocSectionRead)
def update_section(slug: str, payload: DocSectionUpdate, db: Session = Depends(get_db)):
    section = get_section(slug, db)
    for key, value in clean_update(payload).items():
        setattr(section, key, value)
    log_activity(db, "docs", f"Docs updated: {section.title}")
    db.commit()
    db.refresh(section)
    return section
