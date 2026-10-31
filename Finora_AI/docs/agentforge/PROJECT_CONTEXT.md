> **Note (Finora integration):** the FastAPI service described here now lives in `workspace-api/` (it was `backend/`). `backend/` is the Finora Spring Boot API. See the root `README.md`.

# PROJECT_CONTEXT.md — Permanent Project Memory

> **Read this first in every session.** Update it whenever something significant changes
> (new feature, decision, endpoint, table, bug, or stage change). Keep it factual and current.

_Last updated: 2026-10-30 — Session 1 (foundation build)_

---

## 1. Project overview

**AgentForge** is the team's development workspace for an Agentic AI Hackathon. It combines:

- A **project-management workspace** (dashboard, roadmap, progress, docs, team, settings)
- A **provider-agnostic AI agent runtime** (reason → choose tool → execute → observe → answer)
- A **layered architecture** ready to absorb whatever problem statement is announced

**The hackathon problem statement is NOT known yet.** Nothing domain-specific has been built on purpose.

## 2. Current project decisions

| Decision | Choice | Reason / revisit when |
|---|---|---|
| Frontend | React 19 + Vite + TS + Tailwind v4 | Fast, typed. Revisit only if the problem needs e.g. maps/3D libs (add, don't replace) |
| Frontend deps | Only `react`, `react-dom` at runtime | In-repo router, icons, Markdown → fewer install/upgrade risks. Swap in `react-router`/`lucide-react` if needed |
| Backend | FastAPI + Pydantic v2 | Async, OpenAPI docs at `/docs` |
| DB | SQLAlchemy 2 + SQLite | Switch to PostgreSQL via `DATABASE_URL` only |
| Migrations | `Base.metadata.create_all` on startup | Add Alembic once the domain schema stabilises |
| Agent loop | Own ReAct-style JSON protocol | Works with any chat model. Revisit for native tool-calling or LangGraph if problem needs multi-agent graphs |
| Providers | `openai` (OpenAI-compatible) and `anthropic` via raw `httpx` | No SDK lock-in; Groq/OpenRouter/Ollama via `AI_BASE_URL` |
| Secrets | Backend `.env` only, never frontend | `.env` is git-ignored |
| Sample data | Default roadmap/docs are *template* data; team members are *sample* (`is_sample=true`, “Sample” badge) | Replace sample members with real team |
| Phase status | Auto-derived from tasks (`auto_status=true`) unless set manually | Manual status in phase edit modal turns auto off |

## 3. Technology stack

- **Frontend:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4 (`@tailwindcss/vite`)
- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy 2, Pydantic 2, pydantic-settings, httpx
- **Tests/Lint:** pytest, ruff
- **No lockfiles yet** — run `npm install` once and commit `package-lock.json`; pin Python with `pip freeze > requirements.lock` before the demo.

## 4. Folder structure

```
workspace-api/app/
  main.py            FastAPI app; lifespan creates tables + seeds
  seed.py            PHASES, DOC_SECTIONS, INTEGRATIONS, SAMPLE_TEAM; `python -m app.seed --reset`
  core/              config.py (Settings from env), database.py, errors.py (uniform JSON errors)
  models/            project.py (Project, DocSection, Integration, Activity), roadmap.py (Phase, Task),
                     team.py (TeamMember), agent.py (AgentRun)
  schemas/__init__.py  All Pydantic schemas (mirrors frontend/src/types/index.ts)
  api/router.py      Mounts all routers under /api
  api/routes/        health, project, roadmap (phases+tasks), progress, team, docs, integrations, agent
  services/          progress.py (ALL % calculations), activity.py
  agents/            runtime.py (loop), parser.py, prompts.py, memory.py, types.py, service.py
  providers/         base.py (interface), openai_compatible.py, anthropic.py, factory.py
  tools/             base.py (Tool interface), registry.py, builtin/{utility,workspace}.py
  integrations/      base.py (ExternalAPIClient with retries)
workspace-api/tests/       conftest.py (temp DB), test_api.py, test_agent_runtime.py

frontend/src/
  main.tsx, App.tsx  Providers + ROUTES table
  index.css          Tailwind + design tokens (@theme)
  types/index.ts     API types
  lib/               api.ts, router.tsx, useAsync.ts, useRoadmap.ts, workspace.tsx, format.ts
  components/ui/     primitives.tsx, Icon.tsx, Modal.tsx, Toast.tsx, Markdown.tsx
  components/layout/ AppShell.tsx (sidebar, offline banner), navigation.ts
  components/agent/  ExecutionLog.tsx, demoRun.ts (clearly-labelled example trace)
  components/roadmap/TaskRow.tsx, TaskModal.tsx
  components/architecture/ArchitectureDiagram.tsx
  pages/             Dashboard, AgentWorkspace, ProjectOverview, Architecture, Roadmap,
                     Progress, Documentation, Team, Settings
```

## 5. Completed features

- [x] Repository, git, `.gitignore`, `.env.example`, docs set
- [x] FastAPI app with health, project, phases, tasks, progress, team, docs, integrations, agent endpoints
- [x] Uniform error responses `{"error": {"code", "message"}}`; 404s; validation errors
- [x] Dynamic progress (weighted: done=1, in_progress=0.5) per phase, overall, per assignee
- [x] Auto phase status from tasks; activity log on mutations
- [x] Agent runtime: JSON protocol, tool execution, observation feedback, step limit, error capture, run persistence, short-term DB memory
- [x] Providers: OpenAI-compatible, Anthropic; explicit `not_configured` state when no key
- [x] Tools: `get_current_time`, `calculator` (safe AST eval), `get_project_progress`, `list_tasks`, `create_task`
- [x] Frontend: 9 functional pages, dark design system, responsive layout, toasts, modals, offline banner
- [x] Tests: API tests + agent-loop tests with a scripted fake provider

## 6. Pending features

- [ ] **Fill Project Overview** once the problem statement is announced
- [ ] Connect a real AI provider (`.env`)
- [ ] Domain-specific tools + external API clients
- [ ] Domain-specific data models, endpoints and UI screens
- [ ] Domain system prompt (`workspace-api/app/agents/prompts.py` → `AGENT_ROLE`)
- [ ] Streaming (`POST /api/agent/stream` currently returns 501)
- [ ] Alembic migrations; PostgreSQL if deploying
- [ ] Commit `package-lock.json` after first `npm install`
- [ ] Deployment

## 7. Current development stage

**Foundation complete; waiting for the problem statement.** Phase 1 (Problem Identification) is next.

## 8. Important implementation details

- **Settings** load from repo-root `.env`, then optional `workspace-api/.env` (later wins), then real env vars.
- **Run the backend from `backend/`** — the SQLite path `./agentforge.db` is relative to the working directory.
- **Seeding** only runs when the `phases` table is empty. Reset: `cd workspace-api && python -m app.seed --reset` (destroys data).
- **Progress** is never stored — always computed in `services/progress.py`. The “current phase” is the earliest phase not completed.
- **Phase status:** task create/update/delete calls `sync_phase_status`. PATCHing a phase's `status` sets `auto_status=false` unless `auto_status` is sent too.
- **Agent protocol:** model must reply with one JSON object: `{"thought","action","action_input"}` or `{"thought","final_answer"}`. Non-JSON replies are treated as a final answer. See `agents/parser.py`.
- **Agent runs** are stored in `agent_runs` with the full `steps` trace; memory replays the last 6 completed runs for the session.
- **Tools** never raise into the loop — `ToolRegistry.execute` converts exceptions to `ToolResult(ok=False)`.
- **Frontend API** calls go to `/api/...`; Vite proxies to `:8000` in dev. Set `VITE_API_BASE_URL` for separate deployment.
- **Frontend router** is exact-path only (`lib/router.tsx`). Add a route in `App.tsx` ROUTES and `components/layout/navigation.ts`.
- **Demo data** in the UI is limited to `components/agent/demoRun.ts`, shown only via “Preview example trace” with a visible “Demo trace” warning.

## 9. API endpoints (all under `/api`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status, DB check, whether AI is configured |
| GET, PATCH | `/project` | Project definition (overview fields) |
| GET | `/project/activities?limit=` | Activity feed |
| GET, POST | `/phases` | List (with tasks + progress) / create |
| GET, PATCH, DELETE | `/phases/{id}` | Phase detail / update / delete (cascades tasks) |
| GET, POST | `/tasks` | List (filters: `status`, `phase_id`, `assignee_id`) / create |
| PATCH, DELETE | `/tasks/{id}` | Update / delete |
| GET | `/progress` | Full computed progress summary |
| GET, POST | `/team` · PATCH, DELETE `/team/{id}` | Team members |
| GET | `/docs` · GET, PATCH `/docs/{slug}` | Documentation sections |
| GET, POST | `/integrations` · PATCH, DELETE `/integrations/{id}` | Architecture integrations |
| GET | `/agent/config` | Provider/model status (never returns the key) |
| GET | `/agent/tools` | Registered tools + schemas |
| POST | `/agent/run` | Run the agent `{message, session_id}` |
| POST | `/agent/stream` | Placeholder → 501 |
| GET, DELETE | `/agent/runs?session_id=` | Run history / clear |
| GET | `/agent/runs/{id}` | One run |

Full reference: `docs/API.md` and http://localhost:8000/docs.

## 10. Database structure

| Table | Key columns |
|---|---|
| `project` | single row: name, tagline, description, hackathon_name, problem_statement, target_users, proposed_solution, key_features, expected_impact, objectives, demo_date |
| `phases` | id, order, title, description, status, deadline, auto_status |
| `tasks` | id, phase_id→phases (cascade), assignee_id→team_members (set null), title, description, status, priority, due_date, is_sample |
| `team_members` | id, name, role, responsibilities, email, github, is_sample |
| `doc_sections` | id, slug (unique), title, content (Markdown), order |
| `integrations` | id, name, layer, status, description, is_sample |
| `activities` | id, kind, message, created_at |
| `agent_runs` | id, session_id, input, output, status, provider, model, steps (JSON), error, duration_ms, created_at |

All tables with edits have `created_at` / `updated_at` (UTC).

## 11. Known bugs / limitations

- No auth — anyone with network access to the backend can edit data (fine for local demo).
- SQLite foreign keys are enabled per connection (`PRAGMA foreign_keys=ON` in `core/database.py`), so `ON DELETE` rules apply.
- `create_all` does not alter existing tables: after changing a model, delete `backend/agentforge.db` or run `python -m app.seed --reset` (until Alembic is added).
- Session 1 was built in a sandbox without npm/PyPI access: backend logic and agent loop were tested with stubs, the frontend was compiled with esbuild + Tailwind and visually checked against a mock API, but `npm install`/`npm run build`/`pytest` have **not yet been run on a real machine**. Do that first (see §13).

## 12. Next recommended tasks

1. Run the full setup locally (`pip install`, `pytest`, `npm install`, `npm run build`), fix anything environment-specific, commit `package-lock.json`.
2. Push to GitHub (`git remote add origin …`, `git push -u origin main`).
3. When the problem statement arrives, follow `docs/PROBLEM_STATEMENT_PLAYBOOK.md`.
4. Connect an AI provider and try the suggested prompts in Agent Workspace.

## 13. Instructions for continuing development

1. Read this file, then `CLAUDE.md` for conventions.
2. Start both servers (README → Installation). Check http://localhost:8000/docs.
3. Keep layers separate: routes → services/agents → tools/providers/integrations → models.
4. When adding a backend schema, mirror it in `frontend/src/types/index.ts` and add a method to `frontend/src/lib/api.ts`.
5. Add tests for new tools and endpoints in `workspace-api/tests/`.
6. Update **this file** (sections 2, 5, 6, 7, 9, 10, 11, 12) and `TASKS.md` at the end of each session.

## Change log

| Date | Session | Changes |
|---|---|---|
| 2026-10-30 | 1 | Initial foundation: full repo, 9 pages, backend, agent runtime, docs |
