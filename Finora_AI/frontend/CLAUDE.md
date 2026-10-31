# CLAUDE.md — frontend (Finora AI)

This folder is the **Finora AI** frontend (personal finance coach). Read
`frontend/FINORA.md` first: pages, demo vs real features, service layer, required
backend APIs and next steps. `../docs/agentforge/CLAUDE.md` / `PROJECT_CONTEXT.md`
describe the original AgentForge workspace, which now lives under `/workspace`.

Rules specific to this frontend:

- Data access only through `src/services/*` (via `useFinance()` in `src/hooks/useFinance.tsx`).
- All money maths lives in `src/utils/finance.ts` — pure functions, no hardcoded outputs.
- Label sample/demo content; never imply a real AI model, bank connection or PDF parser exists until it does.
- No investment/security recommendations or promised returns in any copy or coach logic.
- INR everywhere (`inr`, `inrCompact`); local dates via `utils/dates.ts` (never `new Date('YYYY-MM-DD')`).
- Chart colours: `--color-series-*` (declared in `:root` in `index.css`) via `data/categories.ts`.
- No new dependencies without a clear need; `npm run build` must pass.
- Update `FINORA.md` (status tables + next tasks) after significant changes.
- Auth: `/login` and `/signup` call `services/authService.ts` (Spring `/api/auth`) in `api` mode; in `local` mode they stay demo-only. Never fake a successful login. `/forgot-password` stays demo-only until the backend has a reset endpoint.
- Backend DTO ⇄ UI mapping lives only in `services/api/mappers.ts`.
- Forms: validate on submit; on blur only for fields the user typed in (blur-time "required" errors shift the layout and swallow clicks).
