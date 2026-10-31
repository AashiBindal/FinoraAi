"""The agent loop: reason -> choose tool -> execute -> observe -> repeat.

This is a provider-agnostic ReAct-style loop. It is fully functional once a
real LLM provider is configured; with no provider it returns an explicit
`not_configured` result instead of pretending to answer.

Extension points:
  * swap `parse_decision` for native function-calling of a specific provider
  * add a planning step before the loop (generate a plan, then execute it)
  * replace with LangGraph / another framework behind the same `run` signature
"""

import json
import logging
import time

from app.agents.memory import AgentMemory, NoMemory
from app.agents.parser import parse_decision
from app.agents.prompts import build_system_prompt
from app.agents.types import AgentResult, AgentStep
from app.providers.base import ChatMessage, LLMProvider, ProviderError
from app.tools.base import ToolContext
from app.tools.registry import ToolRegistry

logger = logging.getLogger("agentforge.agent")


class AgentRuntime:
    def __init__(
        self,
        provider: LLMProvider | None,
        tools: ToolRegistry,
        memory: AgentMemory | None = None,
        max_steps: int = 6,
        not_configured_reason: str = "No AI provider configured.",
    ):
        self.provider = provider
        self.tools = tools
        self.memory = memory or NoMemory()
        self.max_steps = max_steps
        self.not_configured_reason = not_configured_reason

    async def run(self, message: str, ctx: ToolContext) -> AgentResult:
        steps: list[AgentStep] = []

        def add(**kw) -> AgentStep:
            step = AgentStep(index=len(steps), **kw)
            steps.append(step)
            return step

        if self.provider is None:
            add(type="info", content=self.not_configured_reason)
            return AgentResult(
                status="not_configured",
                output="The agent runtime is ready, but no AI model is connected yet. " + self.not_configured_reason,
                steps=steps,
            )

        system = build_system_prompt(self.tools.describe_for_prompt())
        messages = self.memory.history(ctx.session_id) + [ChatMessage(role="user", content=message)]
        meta = {"provider": self.provider.name, "model": self.provider.model}

        for _ in range(self.max_steps):
            t0 = time.perf_counter()
            try:
                reply = await self.provider.complete(system, messages)
            except ProviderError as exc:
                add(type="error", content=str(exc))
                return AgentResult(status="failed", output="", steps=steps, error=str(exc), **meta)
            llm_ms = int((time.perf_counter() - t0) * 1000)

            decision = parse_decision(reply.text)
            messages.append(ChatMessage(role="assistant", content=reply.text))
            if decision.thought:
                add(type="thought", content=decision.thought, duration_ms=llm_ms)

            if decision.final_answer is not None:
                add(type="final", content=decision.final_answer)
                return AgentResult(status="completed", output=decision.final_answer, steps=steps, **meta)

            assert decision.action is not None
            add(type="tool_call", tool=decision.action, tool_input=decision.action_input)
            result, tool_ms = await self.tools.execute(decision.action, decision.action_input, ctx)
            observation = result.as_text()
            add(type="tool_result" if result.ok else "error", tool=decision.action, content=observation, duration_ms=tool_ms)
            messages.append(
                ChatMessage(
                    role="user",
                    content=f"OBSERVATION from {decision.action}: {json.dumps(observation)}\n"
                    "Continue. Reply with one JSON object.",
                )
            )

        add(type="error", content=f"Stopped after {self.max_steps} steps without a final answer.")
        return AgentResult(
            status="max_steps",
            output="I couldn't finish within the step limit. See the execution log for details.",
            steps=steps,
            error="max_steps_reached",
            **meta,
        )
