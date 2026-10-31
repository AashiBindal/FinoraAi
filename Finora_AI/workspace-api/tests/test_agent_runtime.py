"""Agent runtime tests using a scripted fake provider (no network, no API key)."""

import asyncio

from app.agents.parser import parse_decision
from app.agents.runtime import AgentRuntime
from app.providers.base import ChatMessage, LLMProvider, LLMResponse
from app.tools.base import ToolContext
from app.tools.builtin.utility import safe_eval
from app.tools.registry import build_default_registry


class ScriptedProvider(LLMProvider):
    """Returns pre-written replies in order - lets us test the loop deterministically."""

    name = "scripted"

    def __init__(self, replies: list[str]):
        super().__init__(model="scripted-test")
        self.replies = list(replies)
        self.calls: list[list[ChatMessage]] = []

    async def complete(self, system: str, messages: list[ChatMessage]) -> LLMResponse:
        self.calls.append(list(messages))
        return LLMResponse(text=self.replies.pop(0))


def run(runtime: AgentRuntime, msg: str):
    return asyncio.run(runtime.run(msg, ToolContext()))


def test_parser_handles_fenced_json_and_plain_text():
    d = parse_decision('Sure!\n```json\n{"thought": "t", "action": "calculator", "action_input": {"expression": "1+1"}}\n```')
    assert d.action == "calculator" and d.action_input == {"expression": "1+1"}
    assert parse_decision("just text").final_answer == "just text"
    assert parse_decision('{"final_answer": "done"}').final_answer == "done"


def test_safe_eval():
    assert safe_eval("(2 + 3) * 4") == 20
    for bad in ("__import__('os')", "a + 1", "2 ** 1000"):
        try:
            safe_eval(bad)
            raise AssertionError(f"should reject {bad}")
        except ValueError:
            pass


def test_runtime_not_configured():
    result = run(AgentRuntime(provider=None, tools=build_default_registry(), not_configured_reason="nope"), "hi")
    assert result.status == "not_configured"
    assert result.steps[0].type == "info"


def test_runtime_tool_loop():
    provider = ScriptedProvider([
        '{"thought": "need math", "action": "calculator", "action_input": {"expression": "6*7"}}',
        '{"thought": "got it", "final_answer": "42"}',
    ])
    result = run(AgentRuntime(provider=provider, tools=build_default_registry()), "what is 6*7?")
    assert result.status == "completed"
    assert result.output == "42"
    assert [s.type for s in result.steps] == ["thought", "tool_call", "tool_result", "thought", "final"]
    assert "42" in provider.calls[1][-1].content  # observation was fed back


def test_runtime_unknown_tool_is_reported_not_crashing():
    provider = ScriptedProvider([
        '{"action": "does_not_exist", "action_input": {}}',
        '{"final_answer": "recovered"}',
    ])
    result = run(AgentRuntime(provider=provider, tools=build_default_registry()), "x")
    assert result.status == "completed"
    assert any(s.type == "error" for s in result.steps)


def test_runtime_max_steps():
    provider = ScriptedProvider(['{"action": "get_current_time", "action_input": {}}'] * 3)
    result = run(AgentRuntime(provider=provider, tools=build_default_registry(), max_steps=3), "loop")
    assert result.status == "max_steps"
