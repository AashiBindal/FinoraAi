> **Note (Finora integration):** the FastAPI service described here now lives in `workspace-api/` (it was `backend/`). `backend/` is the Finora Spring Boot API. See the root `README.md`.

# CLAUDE.md — Instructions for AI coding assistants

You are working on **AgentForge**, a hackathon workspace with a React frontend, a FastAPI backend and a provider-agnostic agent runtime.

## Before doing anything

1. Read `PROJECT_CONTEXT.md` (project memory: decisions, endpoints, tables, known issues).
2. Check `TASKS.md` for what's in progress.
3. If the hackathon problem statement is now known, follow `docs/PROBLEM_STATEMENT_PLAYBOOK.md`.

## Golden rules

- **Never fake AI behaviour.** If no model/tool is connected, the system must say so (`not_configured`). Demo/sample content must be visibly labelled (see `components/agent/demoRun.ts`, `is_sample` flags).
- **Never hardcode secrets.** Keys go in `.env` (git-ignored) and are read via `app/core/config.py`. Never expose keys to the frontend or return them from an endpoint.
- **Never hardcode progress numbers.** All percentages come from `workspace-api/app/services/progress.py`.
- **Keep layers separate.** Routes are thin; business logic lives in `services/`, agent logic in `agents/`, model calls in `providers/`, capabilities in `tools/`, third-party HTTP in `integrations/`.
- **Don't add dependencies casually.** Justify each one by the problem statement. Prefer small in-repo code for trivial needs.
- **Update `PROJECT_CONTEXT.md`** and `TASKS.md` after significant changes.

## Commands

```bash
# backend (from workspace-api/)
source .venv/bin/activate
uvicorn app.main:app --reload       # http://localhost:8000/docs
pytest                              # tests
ruff check . && ruff format .       # lint/format
python -m app.seed --reset          # wipe + reseed DB (destructive)

# frontend (from frontend/)
npm run dev                         # http://localhost:5173
npm run build                       # tsc type-check + vite build (must pass)
```

## How to add things

### A backend resource
1. Model → `workspace-api/app/models/<name>.py`, import it in `models/__init__.py`
2. Schemas → `workspace-api/app/schemas/__init__.py` (Create / Update / Read)
3. Route module → `workspace-api/app/api/routes/<name>.py`, register in `api/router.py`
4. Logic beyond CRUD → `workspace-api/app/services/<name>.py`
5. Tests → `workspace-api/tests/`
6. Frontend: types in `src/types/index.ts`, client in `src/lib/api.ts`

### An agent tool
1. Subclass `Tool` (`workspace-api/app/tools/base.py`): `name`, `description`, `category`, JSON-schema `parameters`, `async run(ctx, **kwargs) -> ToolResult`
2. Return `ToolResult(ok=False, error=...)` for expected failures; don't raise
3. If it calls a third-party API, put the HTTP client in `workspace-api/app/integrations/` (subclass `ExternalAPIClient`) and read keys from settings
4. Register in `build_default_registry()` in `tools/registry.py`
5. Unit-test the tool directly and via `ScriptedProvider` (see `tests/test_agent_runtime.py`)

### An LLM provider
Subclass `LLMProvider` in `workspace-api/app/providers/`, implement `complete(system, messages)`, add it to `PROVIDERS` in `providers/factory.py`.

### A frontend page
Create `src/pages/<Name>.tsx`, add to `ROUTES` in `src/App.tsx` and to `NAV_SECTIONS` in `src/components/layout/navigation.ts`.

## Coding conventions

**Python**
- Python 3.10+, type hints everywhere, `X | None` style
- SQLAlchemy 2.0 typed `Mapped[...]` models; Pydantic v2 schemas with `from_attributes`
- Raise `NotFoundError` / `AppError` from `core/errors.py` — never return ad-hoc error dicts
- Log activity with `services.activity.log_activity` for user-visible changes
- Line length 120 (ruff)

**TypeScript / React**
- Function components, hooks; strict TS; no `any`
- Reuse `components/ui` primitives (`Card`, `Button`, `Badge`, `ProgressBar`, `Field`, `Modal`, `useToast`…)
- Data loading via `useAsync`; roadmap/team data via `useRoadmap`
- Colours only via design tokens (`bg-panel`, `text-muted`, `border-line`, `text-accent`, `bg-ok-soft`…) defined in `src/index.css`
- Every async UI action shows loading state and surfaces errors with a toast
- Prettier style: no semicolons, single quotes, width 140

## Design language

Dark, quiet, Linear/Vercel-like. One accent colour (`--color-accent`, ember orange). Status colours: ok (green), info (blue), warn (amber), danger (red). 1px `border-line` borders, `rounded-xl` cards, no gradients, no gratuitous animation.

## Workflow

1. Small, focused changes; run `pytest` and `npm run build` before committing
2. Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
3. Update `PROJECT_CONTEXT.md` + `TASKS.md`; tick tasks in the app's Roadmap too
