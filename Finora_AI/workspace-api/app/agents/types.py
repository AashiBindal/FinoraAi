from dataclasses import asdict, dataclass, field
from typing import Any, Literal

StepType = Literal["thought", "tool_call", "tool_result", "final", "error", "info"]
RunStatus = Literal["completed", "failed", "not_configured", "max_steps"]


@dataclass
class AgentStep:
    index: int
    type: StepType
    content: str = ""
    tool: str | None = None
    tool_input: dict[str, Any] | None = None
    duration_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AgentResult:
    status: RunStatus
    output: str
    steps: list[AgentStep] = field(default_factory=list)
    error: str = ""
    provider: str = "none"
    model: str = ""


@dataclass
class AgentDecision:
    """What the model decided to do on one step (parsed from its reply)."""

    thought: str = ""
    action: str | None = None  # tool name, or None when answering
    action_input: dict[str, Any] = field(default_factory=dict)
    final_answer: str | None = None
