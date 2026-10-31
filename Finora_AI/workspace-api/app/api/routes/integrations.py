"""Architecture integrations: documents planned / connected models, APIs, DBs."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import clean_update, get_db, get_or_404
from app.models import Integration
from app.schemas import IntegrationCreate, IntegrationRead, IntegrationUpdate
from app.services.activity import log_activity

router = APIRouter(prefix="/integrations", tags=["architecture"])


@router.get("", response_model=list[IntegrationRead])
def list_integrations(db: Session = Depends(get_db)):
    return db.scalars(select(Integration).order_by(Integration.id)).all()


@router.post("", response_model=IntegrationRead, status_code=201)
def create_integration(payload: IntegrationCreate, db: Session = Depends(get_db)):
    item = Integration(**payload.model_dump())
    db.add(item)
    log_activity(db, "project", f"Integration documented: {item.name}")
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=IntegrationRead)
def update_integration(item_id: int, payload: IntegrationUpdate, db: Session = Depends(get_db)):
    item = get_or_404(db, Integration, item_id)
    for key, value in clean_update(payload).items():
        setattr(item, key, value)
    item.is_sample = False
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_integration(item_id: int, db: Session = Depends(get_db)):
    item = get_or_404(db, Integration, item_id)
    db.delete(item)
    db.commit()
    return Response(status_code=204)
