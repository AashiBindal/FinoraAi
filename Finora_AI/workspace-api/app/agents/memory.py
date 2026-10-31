"""Agent memory.

`AgentMemory` is the interface. `DatabaseMemory` gives short-term
conversational memory by replaying the last N completed runs of a session
from the `agent_runs` table.

Future options (swap in without touching the runtime):
  * summarising memory (compress old turns with the LLM)
  * vector / long-term memory (Chroma, pgvector, Qdrant ...) for RAG
"""

import json
from abc import ABC, abstractmethod

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AgentRun
from app.providers.base import ChatMessage


class AgentMemory(ABC):
    @abstractmethod
    def history(self, session_id: str) -> list[ChatMessage]:
        """Prior conversation turns to prepend to the next run."""


class NoMemory(AgentMemory):
    def history(self, session_id: str) -> list[ChatMessage]:
        return []


class DatabaseMemory(AgentMemory):
    def __init__(self, db: Session, max_turns: int = 6):
        self.db = db
        self.max_turns = max_turns

    def history(self, session_id: str) -> list[ChatMessage]:
        runs = self.db.scalars(
            select(AgentRun)
            .where(AgentRun.session_id == session_id, AgentRun.status == "completed")
            .order_by(AgentRun.id.desc())
            .limit(self.max_turns)
        ).all()
        messages: list[ChatMessage] = []
        for run in reversed(runs):
            messages.append(ChatMessage(role="user", content=run.input))
            messages.append(ChatMessage(role="assistant", content=f'{{"final_answer": {json.dumps(run.output)}}}'))
        return messages

