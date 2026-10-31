# Finora AI — Frontend

> **Your Money. Your Goals. Your Intelligent Financial Coach.**

Finora AI is a personal finance coach with a "living money model": it understands
your income and spending, remembers goals, learns from category corrections,
tracks recurring payments, simulates what-if scenarios and explains your money in
plain language. This document covers the **frontend** (this folder).

_Last updated: 2026-10-31 · Session 4 (connected to the Spring Boot backend - see ../README.md)_

---

## 1. Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc -b) + production build
```

By default Finora talks to the **Spring Boot backend** (`../backend`, port 8080) and
requires login. Vite proxies the Finora `/api/*` paths to `:8080` and the rest of
`/api` to the FastAPI workspace backend on `:8000`. Set
`VITE_FINORA_DATA_SOURCE=local` for the offline demo (localStorage + labelled sample
data, no login). Full setup: `../README.md`.

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | empty | Backend origin for production builds. Empty = same origin / dev proxy |
| `VITE_FINORA_DATA_SOURCE` | `api` | `api` = Spring backend + JWT login · `local` = localStorage demo |
| `VITE_FINORA_COACH_MODE` | follows data source | `api` = `POST /api/ai/chat` · `demo` = rule-based answers |

`VITE_*` values are public. **Never put API keys in the frontend.**

## 2. Pages (all functional)

| Route | Page | What works |
|---|---|---|
| `/` | Dashboard | Income, expenses, net savings & rate, emergency fund, budget use, 6-month income vs expense chart, cumulative spending vs last month, category donut, explainable health score (0–100), rule-based insights, spending alerts, upcoming payments, recent transactions, goal progress |
| `/coach` | AI Finance Coach | Chat with history (persisted), suggested prompts, typing indicator, insight cards, follow-up chips, financial context panel. **Demo mode** — every reply is labelled "Demo response · rule-based" |
| `/transactions` | Transactions | Search, type/category/date-range filters (incl. custom), sort, pagination, detail drawer, add/edit/delete with validation, **category correction + "Remember this correction"** (creates a learned rule, optionally applies to similar transactions), learned-rules panel, **import workflow** (Upload → Processing → Extracted → Review → Confirm) |
| `/subscriptions` | Subscriptions | Monthly total, yearly estimate, next payment, price-increase alerts, self-reported "rarely used" flags, 30-day timeline, detail drawer, pause/resume/cancel, add/edit |
| `/profile` | Money Profile | Income sources, fixed expenses, category budgets, emergency fund, savings, preferences & constraints; validation; live plan summary; saved locally |
| `/goals` | Goal Planner | Create/edit/delete goals, add or withdraw money, on-track status, required monthly amount, projected completion; **what-if simulator** (reduce a category by %, cost changes such as rent +₹3,000) with live goal-date impact |
| `/analytics` | Analytics | 3M/6M/12M/custom ranges; income vs expenses, savings trend, category distribution + table, category over time, budget utilisation, month-over-month table |
| `/alerts` | Smart Alerts | 8 rule types, severity, suggested action, deep links, read/unread (persisted), mark all read, filters |
| `/reports` | Monthly Reports | Totals, savings rate, biggest category, category table, observations, recurring summary, goal progress, **suggested budget for next month**; print-friendly (Print / Save as PDF) |
| `/settings` | Settings | Name/email, currency (INR; others disabled until FX support), budget warning threshold, coach style, alert toggles, export JSON, reset sample data, clear all data, learned rules, privacy info |
| `/login` | Log in | Email + password (show/hide), remember me, forgot-password link, link to sign up. **Frontend only** |
| `/signup` | Sign up | Full name, email, password with strength meter, confirm password, show/hide, terms checkbox. **Frontend only** |
| `/forgot-password` | Forgot password | Email, send-reset-link, "check your inbox" screen with resend cooldown, back to login. **Frontend only** |
| `/workspace/*` | Dev workspace | The original AgentForge hackathon workspace (roadmap, docs, team, backend agent) — unchanged, moved under `/workspace` |

The **top bar** has page title, global transaction search, sample-data badge,
**month selector** (every page reports on the selected month), notifications menu
and profile link. The sidebar collapses to a drawer below 1024px.

## 3. What is real vs demo

| Feature | Status |
|---|---|
| All calculations (totals, budgets, health score, goals, simulations, alerts, suggested budget) | **Real** — computed from your data in `src/utils/finance.ts` |
| Local persistence | **Real** — localStorage (per browser) |
| CSV import | **Real** — parsed in the browser (Date / Description / Amount or Debit/Credit columns) |
| SMS import | **Real** — regex parser for common Indian bank/UPI alerts |
| Correction learning | **Real locally** — rules stored in the browser and applied to new/imported transactions. Marked "Local only" until a backend learning service exists |
| Sample data | **Demo** — fictional user "Aarav Sharma", 6 months of transactions; labelled everywhere |
| AI Finance Coach | **`api` mode:** `POST /api/ai/chat` (Spring AI, needs `AI_ENABLED` + `AI_API_KEY` on the server); if the server AI is off, the reply says so and shows the labelled demo answer. **`demo` mode:** rule-based intents (spending breakdown, save ₹X, rent/cost change, % cuts, dining, emergency fund, subscriptions, goals, budget); refuses security recommendations. No model connected |
| PDF statement import | **Not available** — needs a backend parser. The UI says so and offers a labelled *sample extraction* |
| Subscription usage | **Self-reported** — Finora does not track real usage |
| Bank connections | **None** — and the UI never claims any |
| Multi-currency | **Disabled** — INR only until FX rates exist |
| Login / Sign up | **Real with the backend** (`/api/auth/login`, `/api/auth/register`, JWT). Finora routes are protected; logout clears the token. In `local` mode they stay demo-only with a notice |
| Forgot password | **Demo only** — the backend has no reset endpoint or email service |
| Transactions, subscriptions, goals, profile totals | **Stored on the backend** in `api` mode (mapping layer in `services/api/`). Learned rules, alert read-state, settings, coach history and itemised profile details stay in the browser, per user |

## 4. Architecture

```
src/
  App.tsx                 Route tables: Finora (/) and AgentForge workspace (/workspace)
  main.tsx                Router + Toast providers
  index.css               Design tokens (navy/charcoal, teal accent, violet for AI) + chart series colours
  types/finance.ts        All Finora data types (the API contract)
  data/
    categories.ts         11 categories: label, icon, chart colour (validated palette order)
    sampleData.ts         ⚠️ demo data generator (anchor month = ₹65k income / ₹38k expenses)
  utils/
    finance.ts            Pure calculations (summaries, budgets, health score, goals, simulations)
    alerts.ts             Smart-alert rules
    categorize.ts         Learned rules + keyword categorisation
    importParsers.ts      CSV / SMS parsers, file validation
    currency.ts, dates.ts INR formatting (₹1,20,000 / ₹1.2L), local-date helpers
  services/               THE data layer — the only thing pages talk to
    config.ts             Data source + coach mode from env
    http.ts, storage.ts   fetch wrapper, safe localStorage
    collection.ts         Generic CRUD (local ↔ API) used by the services below
    transactionService.ts (+ category rules)   subscriptionService.ts   goalService.ts
    financeProfileService.ts   settingsService.ts   alertService.ts
    dashboardService.ts   analyticsService.ts   reportService.ts   (view-models)
    financeCoachService.ts + coach/demoCoach.ts
    demoDataService.ts    Seed / reset / clear / export
  hooks/useFinance.tsx    FinanceProvider: loads data once, exposes mutations, derives alerts
  components/
    ui/                   Shared primitives (Button, Card, Badge, Modal, Toast, Icon…)
    common/               Finora blocks (KpiCard, CategoryIcon/Badge, Drawer, Toggle, Segmented, Disclaimer…)
    charts/               Dependency-free SVG BarChart, LineChart, DonutChart (+ legend, tooltips)
    layout/               FinoraShell (sidebar + top bar), finoraNav.ts; AppShell = workspace shell
    coach/ transactions/ goals/   Feature components
  components/auth/        AuthLayout (split brand panel + card), AuthFields (AuthInput, PasswordInput with
                          show/hide + strength meter, AuthCheckbox, SubmitButton, DemoOnlyNotice)
  hooks/useAuthForm.ts    Form state, touched/submit validation, demo submit delay, focus first error
  utils/validation.ts     Email, name, required and password rules (+ strength checks)
  pages/auth/             Login.tsx, SignUp.tsx, ForgotPassword.tsx (full-screen, outside the dashboard shell)
  pages/                  One file per Finora page
  workspace/pages/        Original AgentForge workspace pages
```

**Data flow:** page → `useFinance()` → service → localStorage (or API). After any
mutation the provider updates state, so the dashboard, analytics, alerts and
reports recalculate immediately.

**No new dependencies.** Routing (`lib/router.tsx`), icons (`components/ui/Icon.tsx`),
charts and Markdown are small in-repo modules — the project still has only
`react` and `react-dom` at runtime. Recharts / React Router / Lucide can be added
later if needed; the chart components have simple props that map to Recharts easily.

**Charts** follow a validated colour palette (CVD-safe, ≥3:1 contrast on the dark
surface), fixed category→colour mapping, 2px lines, rounded bar ends, hover
tooltips and legends; a table accompanies each category chart.

## 5. Backend APIs

Implemented and used: see `../README.md` §6. Still **missing** on the backend:
forgot/reset password, verified social login, bulk transaction import, PDF statement
parsing, category-rule learning, alerts + read state, UI settings, bulk delete.

## 6. Next recommended tasks

1. Run the real builds (`mvnw compile`, `npm run build`) and `scripts/smoke-test.ps1`.
2. Backend: store itemised profile details (income sources, fixed costs, budgets) so the profile is the same on every device; add a bulk-import endpoint.
3. Password reset (token + email) and verified Google sign-in.
4. Move the JWT to an httpOnly cookie when the backend supports it.
5. Server-side category-rule learning and recurring-payment detection.

## 7. Conventions for contributors

- Pages never touch localStorage or `fetch` — always go through `services/` via `useFinance()`.
- Backend DTOs are mapped only in `services/api/mappers.ts`; keep UI types stable.
- Every number comes from `utils/finance.ts` (or a service view-model). Never hardcode results.
- Anything demo/sample must be visibly labelled (`SampleBadge`, `DemoNotice`, "Demo response").
- Colours only via tokens in `index.css`; category colours only via `data/categories.ts`.
- Format money with `inr()` / `inrCompact()`; dates with `utils/dates.ts`.
- Keep the financial-safety rules: no security recommendations, no promised returns, no money movement.
