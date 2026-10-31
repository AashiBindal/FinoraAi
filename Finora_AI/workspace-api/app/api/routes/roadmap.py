"""Roadmap phases and tasks."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import clean_update, get_db, get_or_404
from app.core.errors import NotFoundError
from app.models import Phase, Task, TeamMember
from app.schemas import PhaseCreate, PhaseRead, PhaseUpdate, TaskCreate, TaskRead, TaskStatus, TaskUpdate
from app.services.activity import log_activity
from app.services.progress import phase_progress, sync_phase_status

router = APIRouter(tags=["roadmap"])

STATUS_LABEL = {"todo": "To do", "in_progress": "In progress", "done": "Done"}


def _phase_read(phase: Phase) -> PhaseRead:
    p = phase_progress(phase)
    read = PhaseRead.model_validate(phase)
    read.progress, read.task_count, read.done_count = p.progress, p.total, p.done
    return read


def _validate_refs(db: Session, phase_id: int | None, assignee_id: int | None) -> None:
    if phase_id is not None and db.get(Phase, phase_id) is None:
        raise NotFoundError(f"Phase {phase_id} not found")
    if assignee_id is not None and db.get(TeamMember, assignee_id) is None:
        raise NotFoundError(f"Team member {assignee_id} not found")


# ---------------- Phases ----------------
@router.get("/phases", response_model=list[PhaseRead])
def list_phases(db: Session = Depends(get_db)):
    phases = db.scalars(select(Phase).options(selectinload(Phase.tasks)).order_by(Phase.order, Phase.id)).all()
    return [_phase_read(p) for p in phases]


@router.post("/phases", response_model=PhaseRead, status_code=201)
def create_phase(payload: PhaseCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    if data["order"] is None:
        data["order"] = (db.scalar(select(func.max(Phase.order))) or 0) + 1
    phase = Phase(**data)
    db.add(phase)
    log_activity(db, "phase", f"Phase added: {phase.title}")
    db.commit()
    db.refresh(phase)
    return _phase_read(phase)


@router.get("/phases/{phase_id}", response_model=PhaseRead)
def get_phase(phase_id: int, db: Session = Depends(get_db)):
    return _phase_read(get_or_404(db, Phase, phase_id))


@router.patch("/phases/{phase_id}", response_model=PhaseRead)
def update_phase(phase_id: int, payload: PhaseUpdate, db: Session = Depends(get_db)):
    phase = get_or_404(db, Phase, phase_id)
    changes = clean_update(payload, nullable=frozenset({"deadline"}))
    # Setting status manually turns off auto-status unless explicitly re-enabled
    if "status" in changes and "auto_status" not in changes:
        changes["auto_status"] = False
    for key, value in changes.items():
        setattr(phase, key, value)
    if phase.auto_status:
        sync_phase_status(phase)
    if "status" in changes:
        log_activity(db, "phase", f"{phase.title} marked {phase.status.replace('_', ' ')}")
    db.commit()
    db.refresh(phase)
    return _phase_read(phase)


@router.delete("/phases/{phase_id}", status_code=204)
def delete_phase(phase_id: int, db: Session = Depends(get_db)):
    phase = get_or_404(db, Phase, phase_id)
    log_activity(db, "phase", f"Phase removed: {phase.title}")
    db.delete(phase)
    db.commit()
    return Response(status_code=204)


# ---------------- Tasks ----------------
@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(
    status: TaskStatus | None = None,
    phase_id: int | None = None,
    assignee_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Task).order_by(Task.id)
    if status:
        stmt = stmt.where(Task.status == status)
    if phase_id is not None:
        stmt = stmt.where(Task.phase_id == phase_id)
    if assignee_id is not None:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    return db.scalars(stmt).all()


@router.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    _validate_refs(db, payload.phase_id, payload.assignee_id)
    task = Task(**payload.model_dump())
    db.add(task)
    db.flush()
    if task.phase_id:
        phase = db.get(Phase, task.phase_id)
        db.refresh(phase)
        sync_phase_status(phase)
    log_activity(db, "task", f"Task created: {task.title}")
    db.commit()
    db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = get_or_404(db, Task, task_id)
    changes = clean_update(payload, nullable=frozenset({"phase_id", "assignee_id", "due_date"}))
    _validate_refs(db, changes.get("phase_id"), changes.get("assignee_id"))
    old_phase_id, old_status = task.phase_id, task.status
    for key, value in changes.items():
        setattr(task, key, value)
    db.flush()
    for pid in {old_phase_id, task.phase_id} - {None}:
        phase = db.get(Phase, pid)
        db.refresh(phase)
        sync_phase_status(phase)
    if "status" in changes and task.status != old_status:
        log_activity(db, "task", f"“{task.title}” → {STATUS_LABEL[task.status]}")
    elif changes:
        log_activity(db, "task", f"Task updated: {task.title}")
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = get_or_404(db, Task, task_id)
    phase_id = task.phase_id
    log_activity(db, "task", f"Task deleted: {task.title}")
    db.delete(task)
    db.flush()
    if phase_id:
        phase = db.get(Phase, phase_id)
        db.refresh(phase)
        sync_phase_status(phase)
    db.commit()
    return Response(status_code=204)
