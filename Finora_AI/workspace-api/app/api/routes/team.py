from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import clean_update, get_db, get_or_404
from app.models import TeamMember
from app.schemas import TeamMemberCreate, TeamMemberRead, TeamMemberUpdate
from app.services.activity import log_activity

router = APIRouter(prefix="/team", tags=["team"])


@router.get("", response_model=list[TeamMemberRead])
def list_members(db: Session = Depends(get_db)):
    return db.scalars(select(TeamMember).order_by(TeamMember.id)).all()


@router.post("", response_model=TeamMemberRead, status_code=201)
def create_member(payload: TeamMemberCreate, db: Session = Depends(get_db)):
    member = TeamMember(**payload.model_dump())
    db.add(member)
    log_activity(db, "team", f"{member.name} joined the team")
    db.commit()
    db.refresh(member)
    return member


@router.patch("/{member_id}", response_model=TeamMemberRead)
def update_member(member_id: int, payload: TeamMemberUpdate, db: Session = Depends(get_db)):
    member = get_or_404(db, TeamMember, member_id, "Team member")
    for key, value in clean_update(payload).items():
        setattr(member, key, value)
    member.is_sample = False  # edited by a human → no longer sample data
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=204)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = get_or_404(db, TeamMember, member_id, "Team member")
    log_activity(db, "team", f"{member.name} removed from team")
    db.delete(member)
    db.commit()
    return Response(status_code=204)
