# Integration change log — branch `fix/integration`

**Safety net:**
- **Snapshot commit:** `b384ff6` holds everyone's local work before these fixes.
- **Backup tag:** `backup/pre-integration`.
- **Commits:**
  - `05a34bc` makes the backend compile and start safely.
  - `766918f` connects the frontend to the API.
  - A third commit adds the docs and the smoke test.
- **Nothing was pushed**, and git history was not rewritten.

## Final folder layout (packaging step)
| Before | After |
|---|---|
| repo root `pom.xml`, `mvnw*`, `.mvn/`, `src/`, `requests.http`, `HELP.md` | `backend/` (Spring Boot) |
| `backend/` (FastAPI AgentForge workspace) | `workspace-api/` (optional) |
| `README_FINORA.md` | `README.md` (root) |
| old `README.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`, `ROADMAP.md`, `TASKS.md` | `docs/agentforge/` |
| `FINORA_BACKEND_GUIDE.md`, `test_finora_endpoints.ps1` (outdated) | `docs/legacy/` |
| root `.env.example` (FastAPI) | `workspace-api/.env.example`. The root `.env.example` is now the Finora backend template |

Spring reads `../.env` (the project root) and `backend/.env`. Paths shown in the workspace UI and docs were updated to `workspace-api/...`.

## Completed tasks
- [x] Backup branch and tag. Untracked files were checked for secrets before the snapshot commit; none were found.
- [x] Fixed every backend compile error found by the javac type-check (153 → 0).
- [x] Secrets moved to environment variables. `dev` profile (in-memory H2) and `prod` profile (PostgreSQL via environment variables) added.
- [x] Security config restored: JWT, a 401 entry point and a single CORS source.
- [x] Frontend login and sign-up go through the real `/api/auth`. Routes are protected, logout works, and expired or invalid tokens are handled.
- [x] Mapping layer for transactions, subscriptions, goals and the money profile. The backend DTOs are unchanged.
- [x] AI coach wired to `/api/ai/chat`, with an honest, labelled fallback.
- [x] Error handling: Spring error bodies are shown in the UI; the backend returns 404/400 instead of 500 where appropriate.
- [x] Builds and tests that could run here were run (see the root README.md, “Testing status”).
- [x] Wrote the root `README.md` and `scripts/smoke-test.ps1`.

## Changed files

### Backend (`src/main/...`)
| File | Change |
|---|---|
| `config/SecurityConfig.java` | Restored the PasswordEncoder, AuthenticationProvider and AuthenticationManager beans. 401 for unauthenticated requests. Permits auth, docs, `/actuator/health` and CORS preflight. `/api/demo/**` now needs a token (its handler reads the user) |
| `config/CorsConfig.java` | One `CorsConfigurationSource`. Origins come from `CORS_ORIGINS` (default `http://localhost:5173`) |
| `config/AIConfig.java` | `ai.enabled` defaults to false and `ai.api-key` is optional, so the app starts without a key |
| `config/SpringAIConfiguration.java` | No longer throws at startup when the key is missing |
| `controller/ServiceController.java` → `SettingsController.java` | File renamed to match the public class; missing DTO imports added |
| `service/SettingsService.java` | Removed the duplicate `updatePreferences` declaration |
| `service/ServiceImpl/AuthService.java` | Added the missing import. **Social login is disabled** (it trusted a client-supplied email); the logic is kept in `loginVerifiedSocialUser` for later |
| `service/ServiceImpl/DemoSeedServiceImpl.java` | No longer `implements` a concrete class and is no longer a bean (it was an empty TODO placeholder) |
| `seed/DemoDataSeeder.java` | Added the missing import |
| `repository/TransactionRepository.java` | Added the queries the existing services call: category spend projection, typed sums, recent list, date range, category average |
| `repository/FinancialGoalRepository.java` | Added `findByUserIdOrderByTargetDateAsc` |
| `service/DemoSeedService.java`, `LivingMoneyModelService.java`, `FinancialGoalService.java`, `ai/FinancialContextBuilder.java`, `dto/GoalDTOs.java`, `dto/TransactionDTOs.java` | Updated to the current entity fields: `title`, `currentAmount`, `GoalStatus.ACTIVE`, the required goal `category`, and `LocalDateTime` |
| `ai/FallbackRuleBasedCoach.java` | Restored the `AiDTOs` and `LivingMoneyModelDTOs` imports |
| `entity/User.java` | `get/setSavingsGoalPercentage` now read and write `savingsGoalPercent`. Previously they referenced an undefined variable |
| `security/JwtService.java` | Removed the hard-coded default secret. Uses `JWT_SECRET` (≥ 32 chars), or a random key per process |
| `exception/GlobalExceptionHandler.java` | `EntityNotFoundException` → 404. Bad JSON or enum → 400. Bad parameter type → 400. 500 responses no longer leak internals |
| `resources/application.properties` | No secrets. Everything comes from environment variables or an optional `.env`. Defaults to the `dev` profile |
| `resources/application-dev.properties` (new) | In-memory H2 (PostgreSQL mode), `create-drop`, demo seed |
| `resources/application-prod.properties` (new) | PostgreSQL from `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`, `ddl-auto=validate` |
| `.env.example`, `.gitignore` | Spring variables documented. `target/`, `*.class` and H2 files are now ignored |

### Frontend (`frontend/`)
| File | Change |
|---|---|
| `src/services/http.ts` | Bearer token, camelCase ⇄ snake_case, Spring errors including field errors, 401 → logout |
| `src/services/authStore.ts`, `authService.ts`, `hooks/useAuth.ts` (new) | Session handling: remember-me, JWT expiry, safe `next` redirect |
| `src/services/api/mappers.ts`, `api/finoraApi.ts` (new) | DTO mapping and REST adapters, including paged lists |
| `src/services/{transaction,subscription,goal,financeProfile,settings,financeCoach}Service.ts`, `collection.ts`, `config.ts`, `storage.ts` | Switch between API and local mode. Browser-only data is stored per user |
| `src/App.tsx`, `lib/router.tsx` | Protected routes; `navigate(…, {replace})` |
| `src/pages/auth/Login.tsx`, `SignUp.tsx`, `hooks/useAuthForm.ts`, `components/auth/AuthFields.tsx` | Real login and register in API mode with server error display. Local mode keeps the demo notices |
| `src/pages/auth/ForgotPassword.tsx` | Notice now says the backend has no reset endpoint |
| `src/components/layout/FinoraShell.tsx`, `ui/Icon.tsx` | Log out button; status line |
| `src/pages/Settings.tsx`, `services/demoDataService.ts`, `hooks/useFinance.tsx` | API mode: "Add demo data" calls `/api/demo/seed`, bulk delete is disabled, export uses the loaded data |
| `src/pages/FinanceCoach.tsx` | Mode label |
| `vite.config.ts`, `.env.example`, `src/vite-env.d.ts` | Dev proxy splits Spring (`:8080`) from FastAPI (`:8000`). Data source defaults to `api` |

## Unresolved issues / risks
1. **The backend hasn't been built with Maven or started yet.** The type-check used hand-written stand-ins for the external APIs, so runtime wiring (bean creation, JPQL validation, H2 DDL) is unverified. The most likely problem spots:
   - The new JPQL queries in `TransactionRepository`. `AVG` returns a `Double`; Spring Data converts it to `BigDecimal`.
   - `LivingMoneyModelService` event handling during the startup seed.
   - H2 keywords: `NON_KEYWORDS=MONTH,YEAR,VALUE,KEY` is set for the `fc_budgets.month` column.
2. **Old secrets are still in git history** (commits `1d76fae`, `b384ff6` and earlier). Rotate every key and password. Rewriting history needs agreement from the team.
3. **Calling `/api/demo/seed` more than once duplicates the transactions** (backend behaviour).
4. **Dead code that compiles but nothing uses:**
   - Legacy services: `FinancialGoalService`, `FinanceCoachService`, `GoalDTOs`, `TransactionDTOs`, `OAuth2DTOs`.
   - The `service.AuthService` interface (the controller uses the class in `ServiceImpl`).
   - The `model/Li.java` empty enum and the fully commented-out `OAuth2AuthenticationSuccessHandler`.
5. **Package names don't match folders in three files:** `TrendDataPoint` (`dto.response`), the settings DTOs (`dto.settings`), and `MonthlyReportServiceImpl` (`service.report.impl`). This compiles but is confusing.
6. **`target/` and `.idea/` are still tracked in git.** I added them to `.gitignore` but didn't untrack them, because `git rm --cached` would delete teammates' copies when they pull.
7. **`FINORA_BACKEND_GUIDE.md` and `test_finora_endpoints.ps1`** describe `/api/v1/finora/*`, which doesn't exist. Use the root `README.md` and `scripts/smoke-test.ps1` instead. (Both moved to `docs/legacy/`.)
8. **The itemised money profile is stored per browser.** Only the totals are on the server, so a second device shows a summarised profile.

## Manual steps for you
1. `.\mvnw.cmd -DskipTests compile` and send me the output if it fails.
2. `.\mvnw.cmd spring-boot:run`, then `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1` in a second window.
3. `cd frontend; npm install; npm run build; npm run dev`, then log in at http://localhost:5173.
4. Rotate the exposed credentials (DB password, JWT secret, Groq key, Google client secret).
5. Create a `.env` from `.env.example` with your new values. `.env` is git-ignored.
6. When you're ready, push `fix/integration` and open a PR. I haven't pushed anything.
