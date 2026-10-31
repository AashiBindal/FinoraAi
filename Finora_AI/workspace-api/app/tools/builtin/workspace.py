"""Tools that let the agent read and act on this workspace's own data.

These are real tools backed by the database - useful for demoing tool use
before the hackathon-specific tools exist.
"""

from typing import Any

from sqlalchemy import select

from app.models import Phase, Task
from app.services.activity import log_activity
from app.services.progress import compute_summary, sync_phase_status
from app.tools.base import Tool, ToolContext, ToolResult


class ProjectProgressTool(Tool):
    name = "get_project_progress"
    description = "Returns overall progress, task counts and the current roadmap phase."
    category = "workspace"
    parameters = {"type": "object", "properties": {}, "required": []}

    async def run(self, ctx: ToolContext, **kwargs: Any) -> ToolResult:
        if ctx.db is None:
            return ToolResult(ok=False, error="No database session")
        s = compute_summary(ctx.db)
        return ToolResult(
            ok=True,
            output={
                "overall_progress": s.overall_progress,
                "completed": s.completed_tasks,
                "active": s.active_tasks,
                "pending": s.pending_tasks,
                "current_phase": s.current_phase.title if s.current_phase else None,
            },
        )


class ListTasksTool(Tool):
    name = "list_tasks"
    description = "Lists tasks, optionally filtered by status (todo | in_progress | done)."
    category = "workspace"
    parameters = {
        "type": "object",
        "properties": {
            "status": {"type": "string", "enum": ["todo", "in_progress", "done"]},
            "limit": {"type": "integer", "description": "Max tasks to return (default 20)"},
        },
        "required": [],
    }

    async def run(self, ctx: ToolContext, **kwargs: Any) -> ToolResult:
        if ctx.db is None:
            return ToolResult(ok=False, error="No database session")
        stmt = select(Task).order_by(Task.id)
        if kwargs.get("status"):
            stmt = stmt.where(Task.status == kwargs["status"])
        limit = max(1, min(int(kwargs.get("limit", 20)), 100))
        tasks = ctx.db.scalars(stmt.limit(limit)).all()
        return ToolResult(
            ok=True,
            output=[{"id": t.id, "title": t.title, "status": t.status, "phase_id": t.phase_id} for t in tasks],
        )


class CreateTaskTool(Tool):
    name = "create_task"
    description = "Creates a new task in the roadmap. Use phase_order (1-9) to choose the phase."
    category = "workspace"
    parameters = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "phase_order": {"type": "integer", "description": "Roadmap phase number"},
            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
        },
        "required": ["title"],
    }

    async def run(self, ctx: ToolContext, **kwargs: Any) -> ToolResult:
        if ctx.db is None:
            return ToolResult(ok=False, error="No database session")
        phase = None
        if kwargs.get("phase_order") is not None:
            phase = ctx.db.scalar(select(Phase).where(Phase.order == int(kwargs["phase_order"])))
            if phase is None:
                return ToolResult(ok=False, error=f"No phase with order {kwargs['phase_order']}")
        priority = kwargs.get("priority", "medium")
        if priority not in ("low", "medium", "high"):
            priority = "medium"
        task = Task(
            title=str(kwargs["title"])[:255],
            description=str(kwargs.get("description", "")),
            priority=priority,
            phase_id=phase.id if phase else None,
        )
        ctx.db.add(task)
        ctx.db.flush()
        if phase is not None:
            ctx.db.refresh(phase)
            sync_phase_status(phase)
        log_activity(ctx.db, "agent", f"Agent created task “{task.title}”")
        ctx.db.commit()
        return ToolResult(ok=True, output={"id": task.id, "title": task.title, "phase": phase.title if phase else None})
