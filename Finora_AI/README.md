# Finora AI

> **Your Money. Your Goals. Your Intelligent Financial Coach.**

Finora AI is a personal-finance coach. It has a **React** web app (`frontend/`) and a **Java Spring Boot** API (`backend/`) with JWT login, transactions, subscriptions, goals, a money profile and an optional AI coach.

```
Finora_AI/
├── backend/            Spring Boot 3.5 API (Java 21, Maven)       → http://localhost:8080
├── frontend/           React 19 + Vite 7 + Tailwind 4 web app      → http://localhost:5173
├── workspace-api/      OPTIONAL: original AgentForge FastAPI (only for the /workspace pages)
├── scripts/            smoke-test.ps1 - checks the running backend from PowerShell
├── docs/               Change log, architecture notes, original AgentForge docs, legacy files
├── .env.example        Backend settings template → copy to .env
└── README.md           This file
```

---

## 1. Requirements (Windows)

| Tool | Version | Check in PowerShell | Get it |
|---|---|---|---|
| **Java JDK** | **21** | `java -version` | https://adoptium.net (Temurin 21, tick "Set JAVA_HOME") |
| **Node.js** | **20 LTS or newer** (includes npm) | `node -v` and `npm -v` | https://nodejs.org |
| Maven | not needed | – | `backend\mvnw.cmd` downloads it automatically |
| Database | not needed for development | – | Development uses a built-in in-memory database (H2) |
| Python 3.10+ | optional | `python --version` | Only for the optional `workspace-api` |

The first build needs an internet connection, to download Maven, the Java libraries and the npm packages.

If `java -version` reports something other than 21, set `JAVA_HOME` for this window:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.x.x-hotspot"   # your actual folder
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

---

## 2. Quick start (about 5 minutes)

Open **PowerShell** in the extracted `Finora_AI` folder.

### Step 1 - Settings file (optional for a first run)

```powershell
copy .env.example .env
```

The defaults work as they are: in-memory database, demo account, AI off. Edit `.env` later to add a JWT secret, an AI key or a PostgreSQL database (see §3).

### Step 2 - Start the backend (window 1)

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Wait for `Started FinanceCoachApplication`. The first run takes a few minutes while dependencies download.

- Health check: http://localhost:8080/actuator/health → `{"status":"UP"}`
- API docs (Swagger): http://localhost:8080/swagger-ui.html

### Step 3 - Start the frontend (window 2)

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. You'll land on the login page.

### Step 4 - Log in
- **Demo account:** `demo@finance.com` / `Demo@1234`. It already has four months of sample transactions, budgets and two goals.
- **Or** click **Create an account**. A new, empty account opens at **Money Profile**.

Stop either server with **Ctrl + C**. In the dev profile all data is wiped when the backend stops.

---

## 3. Environment variables

The backend reads them from the real environment **or** from `Finora_AI\.env`, which you copied in Step 1. Real environment variables win. **Never commit `.env`**; it's already in `.gitignore`.

| Variable | Default | What it does |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` | `dev` = in-memory H2 + demo data · `prod` = PostgreSQL |
| `DB_URL` | – | **prod only.** JDBC URL, e.g. `jdbc:postgresql://HOST:5432/DBNAME?sslmode=require` |
| `DB_USERNAME`, `DB_PASSWORD` | – | **prod only.** Database login |
| `DDL_AUTO` | `validate` | **prod only.** `validate` never changes tables. `update` lets Hibernate create or alter them |
| `JWT_SECRET` | random each start | **At least 32 characters.** If not set, everyone is logged out when the backend restarts |
| `JWT_EXPIRATION_MS` | `86400000` | Login lifetime (24 h) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins allowed to call the API |
| `AI_ENABLED` | `false` | Set `true` to use the AI coach |
| `AI_API_KEY` | – | Key for an OpenAI-compatible provider, Groq by default. **Leave the line commented out, not empty, when you have no key** |
| `AI_MODEL` | `openai/gpt-oss-120b` | Model id at your provider |
| `AI_BASE_URL` | `https://api.groq.com/openai` | Provider base URL |
| `SEED_DEMO_DATA` | `true` in dev | Create `demo@finance.com` when the database is empty |
| `PORT` | `8080` | Backend port |

Generate a JWT secret in PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Or set values for the current PowerShell window only:

```powershell
$env:JWT_SECRET = "paste-the-generated-value"
$env:AI_ENABLED = "true"; $env:AI_API_KEY = "your-new-key"
```

**Frontend settings** go in `frontend\.env.local`; see `frontend\.env.example`. These values are bundled into the browser, so never put secrets there.

| Variable | Default | What it does |
|---|---|---|
| `VITE_FINORA_DATA_SOURCE` | `api` | `api` = use the backend (login required) · `local` = offline demo in the browser, no backend, no login |
| `VITE_FINORA_COACH_MODE` | follows data source | `api` = server AI coach · `demo` = labelled rule-based answers |
| `VITE_API_BASE_URL` | empty | Only for production builds hosted separately from the API |
| `VITE_SPRING_PROXY_TARGET` | `http://localhost:8080` | Where `npm run dev` forwards API calls |

---

## 4. Database setup

### Development (default): nothing to do
The `dev` profile uses an **in-memory H2** database in PostgreSQL mode. Tables are created at start and deleted at stop. It never connects to Neon or any external database.

### PostgreSQL / Neon (`prod` profile)
1. Create an empty database, either on Neon or locally (e.g. `CREATE DATABASE finora;` in `psql`).
2. In `.env` set:
   ```
   SPRING_PROFILES_ACTIVE=prod
   DB_URL=jdbc:postgresql://YOUR_HOST:5432/finora?sslmode=require
   DB_USERNAME=...
   DB_PASSWORD=...
   JWT_SECRET=...
   ```
3. **First start on an empty database only:** set `DDL_AUTO=update` so Hibernate creates the tables, start once, then set it back to `validate`.
4. Start the backend as in Step 2.

> ⚠️ Point the prod profile at a database you're allowed to change. With `DDL_AUTO=update` Hibernate can add tables and columns. Use a separate database or Neon branch for testing.

---

## 5. Other commands

| What | Command (PowerShell) |
|---|---|
| Compile backend only | `cd backend; .\mvnw.cmd -DskipTests compile` |
| Backend unit tests | `cd backend; .\mvnw.cmd test` |
| Backend runnable JAR | `cd backend; .\mvnw.cmd -DskipTests package` then `java -jar target\personal-finance-coach-1.0.0.jar` (exact file name is in `backend\target`) |
| Smoke-test the running backend (registers a throw-away user) | From `Finora_AI`: `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1` |
| Frontend production build | `cd frontend; npm run build` (output in `frontend\dist`) |
| Preview the production build | `cd frontend; npm run preview` |
| Offline demo without the backend | `cd frontend; $env:VITE_FINORA_DATA_SOURCE="local"; npm run dev` |
| Optional workspace API (`/workspace` pages) | `cd workspace-api; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn app.main:app --reload` (port 8000) |

### Troubleshooting
| Problem | Fix |
|---|---|
| `mvnw.cmd` says JAVA_HOME is not defined or wrong | Install JDK 21 and set `JAVA_HOME` (see §1) |
| `mvnw.cmd` can't download Maven | Check your internet/proxy. Or install Maven 3.9+ and run `mvn spring-boot:run` instead |
| `Port 8080 was already in use` | Stop the other program, or `$env:PORT="8081"` and also `$env:VITE_SPRING_PROXY_TARGET="http://localhost:8081"` before `npm run dev` |
| `npm` scripts blocked ("running scripts is disabled") | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Login page says "Cannot reach the Finora server" | The backend isn't running, or not on 8080 |
| Logged out after restarting the backend | Expected unless `JWT_SECRET` is set. In dev the data is also reset |
| Coach says "The AI coach on the server is not available" | Set `AI_ENABLED=true` and `AI_API_KEY`, then restart the backend |
| Startup error mentioning the OpenAI / AI API key | `AI_API_KEY=` is present but empty. Comment that line out or give it a value |

---

## 6. Architecture

```
Browser (React)                                     Spring Boot (8080)
pages → useFinance() → services/* → http.ts  ──────► JWT filter + CORS → controllers → services → JPA → H2 (dev) / PostgreSQL (prod)
                         │ (api | local)   Bearer token, camelCase ⇄ snake_case          └─► Spring AI → Groq (optional)
                         └ services/api/mappers.ts  (UI model ⇄ backend DTOs; DTOs unchanged)
```

**Frontend (`frontend/src`)**
- `services/config.ts` chooses the data source and coach mode.
- `services/http.ts`:
  - adds the bearer token;
  - converts snake_case ⇄ camelCase;
  - shows Spring error messages, including per-field validation errors;
  - on a **401**, logs the user out and sends them to `/login`.
- `services/authService.ts` and `authStore.ts` handle login and register. The JWT is kept in localStorage when "Remember me" is ticked, otherwise in sessionStorage. Its expiry is read from the token.
- `services/api/finoraApi.ts` and `mappers.ts` are REST adapters. UI-only fields stay in the browser per user: merchant, import source, subscription usage, goal kind, and the itemised profile.
- `App.tsx` protects routes: every Finora page needs a login and redirects to `/login?next=…`. Only in-app redirects are allowed.
- Dashboard, analytics, alerts, reports and the health score are calculated in the browser from your data (`utils/finance.ts`).

**Backend (`backend/src/main/java/com/hackathon/financecoach`)**
- `config/`: Security (stateless JWT, 401), CORS (one place, `CORS_ORIGINS`), AI, OpenAPI.
- `controller/` → `service/` → `service/ServiceImpl/` → `repository/` → `entity/`.
- `security/`: JWT service and filter, user details.
- `exception/GlobalExceptionHandler`: responses look like `{timestamp, status, error, message, path, field_errors}`.

### Field mapping (UI ⇄ backend)
| UI | Backend | Notes |
|---|---|---|
| Transaction `description` / `date` | `title` / `transaction_date` | Merchant and import source are kept in the browser |
| Categories `housing` / `bills` / `healthcare` / `investments` | `RENT` / `UTILITIES` / `HEALTH` / `INVESTMENT` | Backend `SUBSCRIPTIONS` is shown as Entertainment and kept unchanged on save |
| Subscription `frequency` / `billingStartDate` / `notes` | `billing_cycle` / `start_date` / `description` | `next_billing_date` is calculated. `EXPIRED` is shown as cancelled |
| Goal `name` / `savedAmount` / `kind` | `title` / `current_amount` / `category` | Deposits use `/contribute`. Withdrawals use `PUT` |
| Money profile (itemised) | `/api/profile` (totals) | Totals are saved on the server. Line items stay in the browser |

---

## 7. API used by the frontend

Everything except `/api/auth/**`, `/actuator/health` and the Swagger docs needs `Authorization: Bearer <token>`. JSON field names are **snake_case**.

| Method | Path | Body / notes |
|---|---|---|
| POST | `/api/auth/register` | `{full_name, email, password (≥ 8)}` → `{token, token_type, user_id, email, full_name, currency}` |
| POST | `/api/auth/login` | `{email, password}` → same as above |
| GET | `/api/transactions` | `page, size, sortBy, direction` (+ filters) → Spring `Page` (the app fetches all pages) |
| POST, GET/PUT/DELETE `/{id}` | `/api/transactions` | `{title, amount, type, category, transaction_date, payment_method, notes}` |
| GET, POST, GET/PUT/DELETE `/{id}` | `/api/subscriptions` | `{name, amount, billing_cycle, category, start_date, next_billing_date, payment_method, status, description}` |
| GET, POST, GET/PUT/DELETE `/{id}` | `/api/goals` | `{title, target_amount, current_amount, category, target_date, status, monthly_contribution_target}` |
| POST | `/api/goals/{id}/contribute` | `{amount}` |
| GET, POST | `/api/profile` | Money-profile totals. GET returns 404 until the first save |
| PUT | `/api/users/profile` | `{full_name, currency, savings_goal_percent}` |
| POST | `/api/ai/chat` | `{message (≤ 1000 chars)}` → `{response, model}` |
| POST | `/api/demo/seed` | Settings → "Add demo data". Adds sample rows to your account; calling it twice duplicates them |

Other backend endpoints exist that the UI doesn't call, because the browser calculates the same views itself: `/api/dashboard`, `/api/analytics/*`, `/api/reports/monthly`, `/api/budgets*`, `/api/finance/*`, `/api/ai/insights`, `/api/v1/settings/*`.

**Not available on the backend yet.** The app says so where it matters:
- Forgot or reset password.
- Google/social login: disabled, because it trusted a client-supplied email.
- Bulk import: sent as individual requests instead.
- PDF statement parsing.
- Learned category rules: kept in the browser.
- Alerts read-state, settings and coach history: kept in the browser per user.
- "Clear all data": disabled in API mode.

---

## 8. Testing status

The workspace that prepared this package **had no access to Maven Central or the npm registry**, so the official build commands couldn't be run there. Here is what was and wasn't verified:

| Check | Result |
|---|---|
| Backend: all 138 Java source files type-checked with `javac`, using hand-written stand-ins for Spring, JPA, jjwt and Spring AI plus a Lombok expansion script | ✅ 0 errors (the original project had 153) |
| Backend: the existing unit test `LivingMoneyModelServiceTest`, executed with a minimal JUnit-compatible runner | ✅ 3/3 passed |
| Backend: real `mvnw.cmd compile` / `test` | ⏳ **Not run.** Run `cd backend; .\mvnw.cmd test` |
| Backend: starting the app and real HTTP calls (bean wiring, database tables, queries) | ⏳ **Not run.** Start it, then run `scripts\smoke-test.ps1` (not executed yet) |
| Frontend: strict TypeScript check of all source files (React types stubbed) | ✅ 0 errors |
| Frontend: production bundle (esbuild) + Tailwind CSS compile | ✅ |
| Frontend: real `npm install` + `npm run build` (`tsc -b` + Vite) | ⏳ **Not run.** Run `cd frontend; npm install; npm run build` |
| UI in a real browser (Chromium) against a **mock** of the Spring API with the same JSON shapes, paging, 401s and validation errors | ✅ 41/41 flows: sign-up, duplicate email, protected pages, login with redirect, wrong password, remember-me, logout, expired token, open-redirect blocked, add/edit transaction, add subscription, goal create/deposit/withdraw, profile save, AI-coach fallback, per-user data separation, mobile layout |
| Offline demo mode (`VITE_FINORA_DATA_SOURCE=local`) in a browser | ✅ Login/sign-up/forgot-password 38/38. Feature flows 30/33; the 3 failures are known issues in the test script, not the app |
| Optional `workspace-api` (FastAPI) | ⏳ Not run (Python packages unavailable). Its code is unchanged apart from the folder move |
| Full end-to-end: React + real Spring + real database | ❌ **Not tested yet.** Please run §2 and the smoke test |

---

## 9. Security notes
- **No secrets in this package.** All keys, passwords and the JWT secret come from environment variables or your own `.env`.
- **Rotate any keys or passwords that were in older versions of `application.properties`.** They exist in the old git history: database password, JWT secret, Groq key, Google client secret.
- **Token storage:** login tokens are kept in browser storage, so avoid adding untrusted third-party scripts to the frontend.
- **Error responses:** 500 errors don't expose internal details; they're logged on the server.

More detail is in `docs/CHANGES_INTEGRATION.md` (every changed file, open issues, manual steps) and `frontend/FINORA.md` (frontend pages and conventions).
