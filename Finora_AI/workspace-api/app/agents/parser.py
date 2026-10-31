"""Turns raw model text into an AgentDecision.

Models sometimes wrap JSON in ```fences``` or add prose, so we extract the
first balanced JSON object. If no JSON is found, the whole reply is treated
as the final answer (graceful degradation instead of a crash).
"""

import json
import re

from app.agents.types import AgentDecision

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def _first_json_object(text: str) -> dict | None:
    candidates = [m.group(1) for m in _FENCE.finditer(text)] + [text]
    for cand in candidates:
        start = cand.find("{")
        while start != -1:
            depth, in_str, esc = 0, False, False
            for i in range(start, len(cand)):
                ch = cand[i]
                if in_str:
                    if esc:
                        esc = False
                    elif ch == "\\":
                        esc = True
                    elif ch == '"':
                        in_str = False
                elif ch == '"':
                    in_str = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            obj = json.loads(cand[start : i + 1])
                            if isinstance(obj, dict):
                                return obj
                        except json.JSONDecodeError:
                            pass
                        break
            start = cand.find("{", start + 1)
    return None


def parse_decision(text: str) -> AgentDecision:
    obj = _first_json_object(text)
    if obj is None:
        return AgentDecision(final_answer=text.strip())
    thought = str(obj.get("thought", ""))
    if "final_answer" in obj:
        return AgentDecision(thought=thought, final_answer=str(obj["final_answer"]))
    action = obj.get("action")
    if isinstance(action, str) and action:
        action_input = obj.get("action_input") or {}
        if not isinstance(action_input, dict):
            action_input = {"value": action_input}
        return AgentDecision(thought=thought, action=action, action_input=action_input)
    return AgentDecision(thought=thought, final_answer=thought or text.strip())
