"""Built-in tools available before any hackathon-specific tools are added."""

from app.tools.builtin.utility import CalculatorTool, CurrentTimeTool
from app.tools.builtin.workspace import CreateTaskTool, ListTasksTool, ProjectProgressTool

BUILTIN_TOOLS = [CurrentTimeTool, CalculatorTool, ProjectProgressTool, ListTasksTool, CreateTaskTool]

__all__ = ["BUILTIN_TOOLS"]
