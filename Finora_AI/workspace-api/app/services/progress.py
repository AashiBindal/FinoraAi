"""Progress calculation.

Every percentage in the app is derived from real task rows here -
nothing is hardcoded. Rules:

* Task weight: done = 1.0, in_progress = 0.5, todo = 0.0
* Phase progress = weighted task completion inside the phase. A phase with
  no tasks counts as 100 if its status is "completed", otherwise 0.
* Overall progress = weighted completion across ALL tasks (so bigger phases
  matter more). If there are no tasks at all, falls back to the share of
  completed phases.
"""

from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Phase, Task, TeamMember
from app.schemas import Milestone, PhaseProgress, ProgressSummary

TASK_WEIGHT = {"done": 1.0, "in_progress": 0.5, "todo": 0.0}


def _pct(value: float) -> float:
    return round(value * 100, 1)


def task_completion(tasks: list[Task]) -> float:
    if not tasks:
        return 0.0
    return sum(TASK_WEIGHT.get(t.status, 0.0) for t in tasks) / len(tasks)


def phase_progress(phase: Phase) -> PhaseProgress:
    tasks = list(phase.tasks)
    if tasks:
        ratio = task_completion(tasks)
    else:
        ratio = 1.0 if phase.status == "completed" else 0.0
    return PhaseProgress(
        id=phase.id,
        title=phase.title,
        order=phase.order,
        status=phase.status,  # type: ignore[arg-type]
        deadline=phase.deadline,
        total=len(tasks),
        done=sum(1 for t in tasks if t.status == "done"),
        in_progress=sum(1 for t in tasks if t.status == "in_progress"),
        progress=_pct(ratio),
    )


def derive_phase_status(phase: Phase) -> str:
    """Status implied by a phase's tasks (used when auto_status is on)."""
    tasks = list(phase.tasks)
    if not tasks:
        return phase.status
    if all(t.status == "done" for t in tasks):
        return "completed"
    if any(t.status in ("done", "in_progress") for t in tasks):
        return "in_progress"
    return "not_started"


def sync_phase_status(phase: Phase | None) -> None:
    if phase is not None and phase.auto_status:
        phase.status = derive_phase_status(phase)


def compute_summary(db: Session, today: date | None = None) -> ProgressSummary:
    today = today or date.today()
    phases = db.scalars(select(Phase).options(selectinload(Phase.tasks)).order_by(Phase.order, Phase.id)).all()
    all_tasks = db.scalars(select(Task)).all()
    members = {m.id: m.name for m in db.scalars(select(TeamMember)).all()}

    phase_rows = [phase_progress(p) for p in phases]

    if all_tasks:
        overall = _pct(task_completion(list(all_tasks)))
    elif phases:
        overall = _pct(sum(1 for p in phases if p.status == "completed") / len(phases))
    else:
        overall = 0.0

    # Current phase = the earliest phase that isn't finished yet
    current = next((p for p in phase_rows if p.status != "completed"), None)

    milestones = [
        Milestone(
            phase_id=p.id,
            title=p.title,
            deadline=p.deadline,
            status=p.status,
            progress=p.progress,
            days_remaining=(p.deadline - today).days if p.deadline else None,
        )
        for p in phase_rows
    ]

    per_person: dict[int | None, dict[str, int]] = defaultdict(lambda: {"total": 0, "done": 0, "in_progress": 0})
    for t in all_tasks:
        bucket = per_person[t.assignee_id]
        bucket["total"] += 1
        if t.status == "done":
            bucket["done"] += 1
        elif t.status == "in_progress":
            bucket["in_progress"] += 1
    by_assignee = [
        {
            "assignee_id": aid,
            "name": members.get(aid, "Unassigned") if aid else "Unassigned",
            **counts,
            "progress": _pct(counts["done"] / counts["total"]) if counts["total"] else 0.0,
        }
        for aid, counts in per_person.items()
    ]
    by_assignee.sort(key=lambda r: (r["assignee_id"] is None, r["name"]))

    return ProgressSummary(
        overall_progress=overall,
        total_tasks=len(all_tasks),
        completed_tasks=sum(1 for t in all_tasks if t.status == "done"),
        active_tasks=sum(1 for t in all_tasks if t.status == "in_progress"),
        pending_tasks=sum(1 for t in all_tasks if t.status == "todo"),
        phases_completed=sum(1 for p in phases if p.status == "completed"),
        phases_total=len(phases),
        current_phase=current,
        phases=phase_rows,
        milestones=milestones,
        by_assignee=by_assignee,
    )
