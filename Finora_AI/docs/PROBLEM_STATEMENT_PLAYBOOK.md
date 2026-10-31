# Problem Statement Playbook

What to do, in order, when the organisers announce the problem. Target: a demoable vertical slice as early as possible, then iterate.

## Hour 0 — Capture (15 min)

1. **Docs → Problem Statement**: paste the official text, rules and judging criteria verbatim.
2. **Project Overview → Edit**: problem statement, target users, objectives (draft quality is fine).
3. **Settings**: hackathon name. **Roadmap**: set phase deadlines from the schedule.
4. Tick Phase 1 tasks in the Roadmap.

## Hour 0–1 — Decide (30–45 min)

Answer these and record them in `PROJECT_CONTEXT.md §2` and Docs → Proposed Solution:

| Question | Drives |
|---|---|
| What single task should the agent complete end-to-end in the demo? | MVP scope, demo script |
| Which external data/APIs does it need? Free tier? Rate limits? | `integrations/`, `.env.example` |
| Which actions must the agent take (read/write/notify/book…)? | `tools/` |
| Does it need documents/knowledge retrieval? | Vector store? (only then) |
| Multi-agent or human approval steps? | Keep built-in loop vs. LangGraph |
| Which model? (cost, speed, tool-use quality, provided credits) | `.env` `AI_*` |
| What must the user see? | New pages/components |

**Only change the stack when an answer requires it.** Record every change and why.

## Files to update

| File | Change |
|---|---|
| `workspace-api/app/agents/prompts.py` | Replace `AGENT_ROLE` with the domain role, goals, constraints |
| `workspace-api/app/integrations/<service>.py` | One client per external API |
| `workspace-api/app/tools/<domain>.py` + `tools/registry.py` | Domain tools; register them |
| `workspace-api/app/core/config.py` + `.env.example` | New API keys / settings |
| `workspace-api/app/models/`, `schemas/`, `api/routes/` | Domain entities + endpoints |
| `frontend/src/types/index.ts`, `lib/api.ts` | Mirror new endpoints |
| `frontend/src/pages/` + `App.tsx` + `navigation.ts` | Domain screens |
| `workspace-api/app/seed.py` | Optional: domain demo data — **label it as sample** |
| `PROJECT_CONTEXT.md`, `TASKS.md`, `README.md` | Decisions, endpoints, tables, status |
| Roadmap (in app) | Replace generic tasks with concrete ones per phase |

## Build order (vertical slice first)

1. One API client + one tool → unit test it
2. Connect the model; make the agent use that tool from Agent Workspace
3. One domain endpoint + one screen showing the result
4. Widen: more tools, multi-step flow, memory, polish
5. Phase 8 hardening: failure cases, fallbacks, timeouts
6. Phase 9: demo script, backup video, slides, README

## Demo safety net

- Keep a recorded run of the happy path
- Pre-seed realistic (labelled) sample data so the demo doesn't depend on live input
- Have a cheaper/faster fallback model configured via `AI_BASE_URL`
- Test on the demo machine and network beforehand
