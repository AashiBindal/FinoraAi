"""Pydantic request/response schemas (the API contract).

Keep these in sync with `frontend/src/types/index.ts`.
"""

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

PhaseStatus = Literal["not_started", "in_progress", "completed"]
TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]
Layer = Literal["frontend", "backend", "database", "agent", "tools"]
IntegrationStatus = Literal["planned", "in_progress", "connected"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------- Project ----------------
class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    tagline: str = ""
    description: str = ""
    hackathon_name: str = ""
    problem_statement: str = ""
    target_users: str = ""
    proposed_solution: str = ""
    key_features: str = ""
    expected_impact: str = ""
    objectives: str = ""
    demo_date: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    tagline: str | None = None
    description: str | None = None
    hackathon_name: str | None = None
    problem_statement: str | None = None
    target_users: str | None = None
    proposed_solution: str | None = None
    key_features: str | None = None
    expected_impact: str | None = None
    objectives: str | None = None
    demo_date: str | None = None


class ProjectRead(ORMModel, ProjectBase):
    id: int
    updated_at: datetime


# ---------------- Tasks ----------------
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    phase_id: int | None = None
    assignee_id: int | None = None
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    phase_id: int | None = None
    assignee_id: int | None = None
    due_date: date | None = None


class TaskRead(ORMModel):
    id: int
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    phase_id: int | None
    assignee_id: int | None
    due_date: date | None
    is_sample: bool
    created_at: datetime
    updated_at: datetime


# ---------------- Phases ----------------
class PhaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = ""
    status: PhaseStatus = "not_started"
    deadline: date | None = None
    order: int | None = None


class PhaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    status: PhaseStatus | None = None
    deadline: date | None = None
    order: int | None = None
    auto_status: bool | None = None


class PhaseRead(ORMModel):
    id: int
    order: int
    title: str
    description: str
    status: PhaseStatus
    deadline: date | None
    auto_status: bool
    tasks: list[TaskRead]
    progress: float = 0.0
    task_count: int = 0
    done_count: int = 0


# ---------------- Progress ----------------
class PhaseProgress(BaseModel):
    id: int
    title: str
    order: int
    status: PhaseStatus
    deadline: date | None
    total: int
    done: int
    in_progress: int
    progress: float


class Milestone(BaseModel):
    phase_id: int
    title: str
    deadline: date | None
    status: PhaseStatus
    progress: float
    days_remaining: int | None


class ProgressSummary(BaseModel):
    overall_progress: float
    total_tasks: int
    completed_tasks: int
    active_tasks: int
    pending_tasks: int
    phases_completed: int
    phases_total: int
    current_phase: PhaseProgress | None
    phases: list[PhaseProgress]
    milestones: list[Milestone]
    by_assignee: list[dict[str, Any]]


# ---------------- Team ----------------
class TeamMemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: str = ""
    responsibilities: str = ""
    email: str = ""
    github: str = ""


class TeamMemberUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: str | None = None
    responsibilities: str | None = None
    email: str | None = None
    github: str | None = None


class TeamMemberRead(ORMModel):
    id: int
    name: str
    role: str
    responsibilities: str
    email: str
    github: str
    is_sample: bool


# ---------------- Docs ----------------
class DocSectionRead(ORMModel):
    id: int
    slug: str
    title: str
    content: str
    order: int
    updated_at: datetime


class DocSectionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    content: str | None = None


# ---------------- Integrations ----------------
class IntegrationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    layer: Layer = "tools"
    status: IntegrationStatus = "planned"
    description: str = ""


class IntegrationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    layer: Layer | None = None
    status: IntegrationStatus | None = None
    description: str | None = None


class IntegrationRead(ORMModel):
    id: int
    name: str
    layer: Layer
    status: IntegrationStatus
    description: str
    is_sample: bool


# ---------------- Activity ----------------
class ActivityRead(ORMModel):
    id: int
    kind: str
    message: str
    created_at: datetime


# ---------------- Agent ----------------
class AgentRunRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    session_id: str = Field(default="default", max_length=64)


class AgentStep(BaseModel):
    index: int
    type: Literal["thought", "tool_call", "tool_result", "final", "error", "info"]
    content: str = ""
    tool: str | None = None
    tool_input: dict[str, Any] | None = None
    duration_ms: int = 0


class AgentRunRead(ORMModel):
    id: int
    session_id: str
    input: str
    output: str
    status: str
    provider: str
    model: str
    steps: list[AgentStep]
    error: str
    duration_ms: int
    created_at: datetime


class AgentConfigRead(BaseModel):
    provider: str
    model: str
    configured: bool
    base_url: str
    max_steps: int
    message: str
    supported_providers: list[str]


class ToolRead(BaseModel):
    name: str
    description: str
    category: str
    parameters: dict[str, Any]
