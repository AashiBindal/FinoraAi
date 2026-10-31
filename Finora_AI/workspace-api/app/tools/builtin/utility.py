"""General-purpose, side-effect-free tools. These are real, working tools."""

import ast
import operator
from datetime import datetime, timezone
from typing import Any

from app.tools.base import Tool, ToolContext, ToolResult


class CurrentTimeTool(Tool):
    name = "get_current_time"
    description = "Returns the current date and time in UTC (ISO 8601)."
    category = "utility"
    parameters = {"type": "object", "properties": {}, "required": []}

    async def run(self, ctx: ToolContext, **kwargs: Any) -> ToolResult:
        return ToolResult(ok=True, output=datetime.now(timezone.utc).isoformat(timespec="seconds"))


_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def safe_eval(expr: str) -> float:
    """Evaluate arithmetic without `eval` (no names, calls or attributes)."""

    def _eval(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
            if isinstance(node.op, ast.Pow) and abs(_eval(node.right)) > 100:
                raise ValueError("Exponent too large")
            return _OPS[type(node.op)](_eval(node.left), _eval(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](_eval(node.operand))
        raise ValueError("Only numbers and + - * / // % ** ( ) are allowed")

    if len(expr) > 200:
        raise ValueError("Expression too long")
    return _eval(ast.parse(expr, mode="eval"))


class CalculatorTool(Tool):
    name = "calculator"
    description = "Evaluates an arithmetic expression, e.g. '(12.5 * 4) / 3'."
    category = "utility"
    parameters = {
        "type": "object",
        "properties": {"expression": {"type": "string", "description": "Arithmetic expression"}},
        "required": ["expression"],
    }

    async def run(self, ctx: ToolContext, **kwargs: Any) -> ToolResult:
        try:
            return ToolResult(ok=True, output=safe_eval(str(kwargs["expression"])))
        except (ValueError, SyntaxError, ZeroDivisionError, OverflowError) as exc:
            return ToolResult(ok=False, error=str(exc))
