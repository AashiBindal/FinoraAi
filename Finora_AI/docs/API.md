# API Reference

Base URL: `http://localhost:8000/api` · Interactive docs: `http://localhost:8000/docs`

All errors use one shape:

```json
{ "error": { "code": "not_found", "message": "Task 12 not found" } }
```

Codes: `bad_request` (400), `not_found` (404), `validation_error` (422, with `details`), `not_implemented` (501), `not_configured` (503), `internal_error` (500).

## Health

`GET /health` →
```json
{ "status": "ok", "app": "AgentForge API", "environment": "development",
  "database": "ok", "database_engine": "sqlite", "ai_provider_configured": false }
```

## Project

- `GET /project` → `ProjectRead`
- `PATCH /project` — any subset of: `name, tagline, description, hackathon_name, problem_statement, target_users, proposed_solution, key_features, expected_impact, objectives, demo_date` (list-like fields are newline-separated text)
- `GET /project/activities?limit=20` → `ActivityRead[]` (newest first)

## Roadmap

- `GET /phases` → `PhaseRead[]` including `tasks`, `progress`, `task_count`, `done_count`
- `POST /phases` `{title, description?, status?, deadline?, order?}`
- `GET | PATCH | DELETE /phases/{id}` — PATCH accepts `title, description, status, deadline, order, auto_status`. Setting `status` without `auto_status` disables auto-status.
- `GET /tasks?status=&phase_id=&assignee_id=`
- `POST /tasks` `{title, description?, status?, priority?, phase_id?, assignee_id?, due_date?}`
- `PATCH | DELETE /tasks/{id}`

Enums — task `status`: `todo | in_progress | done`; `priority`: `low | medium | high`; phase `status`: `not_started | in_progress | completed`.

## Progress

`GET /progress` → `ProgressSummary`:
`overall_progress, total_tasks, completed_tasks, active_tasks, pending_tasks, phases_completed, phases_total, current_phase, phases[], milestones[], by_assignee[]`

## Team

`GET /team` · `POST /team {name, role?, responsibilities?, email?, github?}` · `PATCH | DELETE /team/{id}`

## Documentation

`GET /docs` · `GET /docs/{slug}` · `PATCH /docs/{slug} {title?, content?}`

Slugs: `problem-statement, research, proposed-solution, technical-architecture, agent-workflow, api-docs, database-schema, testing, installation, presentation`

## Integrations

`GET /integrations` · `POST /integrations {name, layer, status, description}` · `PATCH | DELETE /integrations/{id}`
`layer`: `frontend | backend | database | agent | tools`; `status`: `planned | in_progress | connected`

## Agent

- `GET /agent/config` → `{provider, model, configured, base_url, max_steps, message, supported_providers}` (never the key)
- `GET /agent/tools` → `[{name, description, category, parameters}]`
- `POST /agent/run` `{message, session_id?="default"}` → `AgentRunRead`
  - `status`: `completed | failed | not_configured | max_steps`
  - `steps[]`: `{index, type, content, tool, tool_input, duration_ms}` with `type` in `thought | tool_call | tool_result | final | error | info`
- `POST /agent/stream` → 501 (placeholder)
- `GET /agent/runs?session_id=&limit=` (oldest first) · `GET /agent/runs/{id}` · `DELETE /agent/runs?session_id=`

### Example

```bash
curl -s localhost:8000/api/agent/run -H 'content-type: application/json' \
  -d '{"message":"What is 18% of 2450?"}' | python -m json.tool
```
