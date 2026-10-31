"""First-run seed data.

Two kinds of rows are created:
  * TEMPLATE data - the 9-phase roadmap, foundation tasks, documentation
    section skeletons and core architecture layers. These are real defaults
    for the workspace and are meant to be edited.
  * SAMPLE data - placeholder team members (is_sample=True). The UI shows a
    "Sample" badge on them. Edit or delete them freely.

Seeding only runs when the database has no phases, so it never overwrites
your work. Reset everything with:  python -m app.seed --reset
"""

import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine, init_db
from app.models import Activity, DocSection, Integration, Phase, Project, Task, TeamMember

PHASES: list[tuple[str, str, list[tuple[str, str]]]] = [
    # (title, description, [(task title, status)])
    ("Problem Identification", "Understand the announced problem statement, theme and judging criteria.", [
        ("Read the official problem statement and rules", "todo"),
        ("Identify the core real-world problem and who it affects", "todo"),
        ("Write the problem statement in Project Overview", "todo"),
    ]),
    ("Research and Requirement Analysis", "Research existing solutions, data sources, APIs and constraints.", [
        ("Research existing solutions and their gaps", "todo"),
        ("List available APIs, datasets and tools", "todo"),
        ("Define functional and non-functional requirements", "todo"),
    ]),
    ("Solution Design", "Define the agent's goal, user flows and the MVP scope.", [
        ("Define MVP scope and demo storyline", "todo"),
        ("Design the agent's decision flow and tools", "todo"),
        ("Sketch key user flows / screens", "todo"),
    ]),
    ("System Architecture", "Layered architecture: frontend, backend, database, agent, tools/APIs.", [
        ("Set up repository and project structure", "done"),
        ("Define modular layered architecture", "done"),
        ("Decide final stack changes for the problem (models, DB, APIs)", "todo"),
    ]),
    ("AI Agent Development", "Implement reasoning, planning, memory and task execution.", [
        ("Build provider-agnostic agent runtime skeleton", "done"),
        ("Connect a real LLM provider via .env", "todo"),
        ("Write the domain-specific system prompt", "todo"),
        ("Add multi-step planning for the problem's workflow", "todo"),
    ]),
    ("Tool and API Integration", "Wrap external APIs as agent tools with error handling.", [
        ("Create tool registry with built-in tools", "done"),
        ("Implement API clients for the problem's external services", "todo"),
        ("Register domain tools and test them in isolation", "todo"),
    ]),
    ("Frontend and Backend Integration", "Connect the UI to real agent output and domain data.", [
        ("Wire frontend workspace to FastAPI backend", "done"),
        ("Build domain-specific screens for the solution", "todo"),
        ("Show real agent steps and tool results in the UI", "todo"),
    ]),
    ("Testing and Optimization", "Test agent reliability, edge cases, latency and cost.", [
        ("Write tests for tools and agent flows", "todo"),
        ("Test failure cases (API down, bad model output)", "todo"),
        ("Optimise prompts, latency and token usage", "todo"),
    ]),
    ("Final Demo and Presentation", "Prepare the live demo, slides and submission.", [
        ("Prepare demo script and backup recording", "todo"),
        ("Build presentation slides", "todo"),
        ("Final README update and submission", "todo"),
    ]),
]

DOC_SECTIONS: list[tuple[str, str, str]] = [
    ("problem-statement", "Problem Statement",
     "## Official problem statement\n_Paste the organiser's statement here once announced._\n\n## Our interpretation\n- What is the real-world problem?\n- Who experiences it, and how often?\n- Why do current solutions fall short?\n"),
    ("research", "Research and References",
     "## Existing solutions\n- \n\n## Datasets / APIs found\n| Name | Link | Free tier? | Notes |\n|---|---|---|---|\n|  |  |  |  |\n\n## Key insights\n- \n"),
    ("proposed-solution", "Proposed Solution",
     "## One-line pitch\n\n## How the agent solves the problem\n1. \n2. \n3. \n\n## MVP scope (what we demo)\n- \n\n## Out of scope\n- \n"),
    ("technical-architecture", "Technical Architecture",
     "## Layers\n- **Frontend:** React + Vite + TypeScript + Tailwind\n- **Backend:** FastAPI (Python)\n- **Database:** SQLite (PostgreSQL-ready via DATABASE_URL)\n- **Agent:** provider-agnostic ReAct loop in `backend/app/agents`\n- **Tools/APIs:** registry in `backend/app/tools`, clients in `backend/app/integrations`\n\n## Stack changes for this problem\n_Document any added framework / DB / API and why._\n"),
    ("agent-workflow", "Agent Workflow",
     "## Goal\n\n## Loop\n1. Receive user goal\n2. Reason about next step (thought)\n3. Select a tool and input\n4. Execute tool, observe result\n5. Repeat until final answer or step limit\n\n## Tools the agent can use\n- \n\n## Failure handling\n- \n"),
    ("api-docs", "API Documentation",
     "Interactive docs are served by FastAPI at **http://localhost:8000/docs**.\n\n## Core endpoints\n- `GET /api/health`\n- `GET|PATCH /api/project`\n- `GET|POST /api/phases`, `PATCH|DELETE /api/phases/{id}`\n- `GET|POST /api/tasks`, `PATCH|DELETE /api/tasks/{id}`\n- `GET /api/progress`\n- `POST /api/agent/run`, `GET /api/agent/config`, `GET /api/agent/tools`\n\n## Domain endpoints\n_Add the endpoints you build for the problem here._\n"),
    ("database-schema", "Database Schema",
     "## Workspace tables\n`project`, `phases`, `tasks`, `team_members`, `doc_sections`, `integrations`, `activities`, `agent_runs`\n\n## Domain tables\n_Add tables you create for the problem statement._\n"),
    ("testing", "Testing Documentation",
     "## Automated\n- Backend: `cd backend && pytest`\n- Frontend: `cd frontend && npm run build` (type-check + build)\n\n## Manual test cases\n| Case | Steps | Expected | Result |\n|---|---|---|---|\n|  |  |  |  |\n"),
    ("installation", "Installation Guide",
     "See the root README.md for full instructions.\n\n```bash\n# backend\ncd backend && python -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt && uvicorn app.main:app --reload\n\n# frontend\ncd frontend && npm install && npm run dev\n```\n"),
    ("presentation", "Final Presentation Notes",
     "## Demo storyline (3-5 min)\n1. Problem (30s)\n2. Solution + live agent demo (2-3 min)\n3. Architecture (30s)\n4. Impact & next steps (30s)\n\n## Judges' likely questions\n- \n\n## Backup plan if live demo fails\n- \n"),
]

INTEGRATIONS = [
    ("React + Vite UI", "frontend", "connected", "Dashboard, agent workspace and project management UI."),
    ("FastAPI REST API", "backend", "connected", "Routes under /api, OpenAPI docs at /docs."),
    ("SQLite (SQLAlchemy)", "database", "connected", "Switch to PostgreSQL by changing DATABASE_URL."),
    ("LLM provider", "agent", "planned", "OpenAI-compatible or Anthropic, selected via AI_PROVIDER in .env."),
    ("Built-in workspace tools", "tools", "connected", "Time, calculator, progress, list/create tasks."),
    ("Domain APIs (to be decided)", "tools", "planned", "Add once the problem statement is announced."),
]

SAMPLE_TEAM = [
    ("Team Member 1 (sample)", "Full-stack / AI lead", "Agent runtime, backend APIs, integration"),
    ("Team Member 2 (sample)", "Frontend / UX", "UI screens, demo polish, presentation"),
]


def seed(db: Session) -> bool:
    """Insert defaults if the DB is empty. Returns True if anything was seeded."""
    if db.scalar(select(Phase).limit(1)) is not None:
        return False

    if db.scalar(select(Project).limit(1)) is None:
        db.add(Project(
            name="AgentForge",
            tagline="Agentic AI hackathon workspace",
            description="Central workspace for building, tracking and demoing our agentic AI solution.",
        ))

    for order, (title, desc, tasks) in enumerate(PHASES, start=1):
        phase = Phase(order=order, title=title, description=desc)
        phase.tasks = [Task(title=t, status=s) for t, s in tasks]
        statuses = {s for _, s in tasks}
        phase.status = "completed" if statuses == {"done"} else "in_progress" if "done" in statuses else "not_started"
        db.add(phase)

    for order, (slug, title, content) in enumerate(DOC_SECTIONS):
        db.add(DocSection(slug=slug, title=title, content=content, order=order))

    for name, layer, status, desc in INTEGRATIONS:
        db.add(Integration(name=name, layer=layer, status=status, description=desc,
                           is_sample=name.startswith("Domain APIs")))

    for name, role, resp in SAMPLE_TEAM:
        db.add(TeamMember(name=name, role=role, responsibilities=resp, is_sample=True))

    db.add(Activity(kind="system", message="Workspace initialised with default roadmap and docs"))
    db.commit()
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the AgentForge database")
    parser.add_argument("--reset", action="store_true", help="DROP all tables and re-seed (destroys data)")
    args = parser.parse_args()
    if args.reset:
        Base.metadata.drop_all(bind=engine)
    init_db()
    with SessionLocal() as db:
        print("Seeded." if seed(db) else "Database already has data; nothing to do.")


if __name__ == "__main__":
    main()
