> **Outdated:** this guide describes `/api/v1/finora/*` endpoints that were never implemented. The real API is documented in the root `README.md`.

# Finora AI — Backend Architecture & API Specification

**Product**: Finora AI  
**Tagline**: *Your Money. Your Goals. Your Intelligent Financial Coach.*  
**Backend Tech Stack**: Java 21, Spring Boot 3.5.6, Spring AI 1.0.0 (Groq / OpenAI-compatible), Spring Data JPA, PostgreSQL  
**Architecture Package**: `com.agentforge.finora.*`  

---

## 1. Architectural Overview & Problem Statement

Finora AI is a **Personal Finance Coach with a Living Money Model**. Unlike standard expense trackers, Finora AI:
1. **Maintains a Living Money Model**: Dynamically balances monthly income, fixed commitments, discretionary burn, emergency reserve coverage, and savings rates in INR (₹).
2. **Learns from Transaction Corrections**: An adaptive `CorrectionLearningEngine` that remembers merchant re-categorizations (e.g. Swiggy → Food & Dining, BESCOM → Bills & Utilities) and automatically applies learned rules to newly uploaded statements.
3. **Simulates Future Financial Scenarios**: Dynamic What-If simulation engine calculating exact disposable income shifts, annual savings velocity, and goal completion date impacts (e.g., reducing dining by 30% or handling a ₹3,000 rent hike).
4. **Context-Aware Spring AI Agent**: Connects via Spring AI `ChatClient` with Groq (`llama-3.3-70b-versatile`), using Spring AI `@Tool` functions (`FinanceCoachTools`) to directly query the database, living model, and what-if calculations.
5. **Failsafe Graceful Simulation**: If Groq is running or unconfigured, it seamlessly provides structured financial coaching without throwing 500 errors.

---

## 2. Groq Spring AI Configuration

To connect Groq to Spring AI, add the following to your `application.properties` (or set them as environment variables):

```properties
# App AI Toggle
app.ai-enabled=true

# Spring AI OpenAI-Compatible Groq Setup
spring.ai.openai.api-key=${GROQ_API_KEY}
spring.ai.openai.base-url=https://api.groq.com/openai/v1
spring.ai.openai.chat.options.model=llama-3.3-70b-versatile
spring.ai.openai.chat.options.temperature=0.7

# Finora Living Model Defaults
finora.default.currency=INR
```

> **Security Note**: Never commit your `GROQ_API_KEY`. Set it in your OS environment (`set GROQ_API_KEY=gsk_...` or export in terminal).

---

## 3. Spring Boot REST API Endpoints (For Teammate's Frontend)

All endpoints are prefixed with `/api/v1/finora/` and configured with CORS.

### 3.1 Financial Dashboard
- **`GET /api/v1/finora/dashboard`**
  - **Description**: Returns complete financial overview including total income (₹65,000), total expenses (₹38,000), current savings (₹27,000), savings rate (41.5%), emergency fund status (₹1,20,000 / 3.15 months coverage), health score (88/100), monthly trend chart points, category breakdown, goal progress, and AI financial observations.

### 3.2 AI Finance Coach
- **`POST /api/v1/finora/coach/chat`**
  - **Request Body**:
    ```json
    {
      "message": "What happens if my rent increases by ₹3,000?",
      "sessionId": "session-123"
    }
    ```
  - **Response**:
    ```json
    {
      "sessionId": "session-123",
      "reply": "If your rent increases by ₹3,000 per month (from ₹16,000 to ₹19,000)...",
      "isSimulated": false,
      "modelUsed": "llama-3.3-70b-versatile",
      "insightCards": [
        {
          "type": "WARNING",
          "title": "Rent Hike Impact",
          "description": "Increases fixed housing expenses from ₹16,000 to ₹19,000.",
          "metric": "+₹3,000/mo"
        }
      ],
      "suggestedPrompts": [
        "Where is most of my money going?",
        "How can I save ₹10,000 monthly?",
        "What happens if my rent increases by ₹3,000?"
      ],
      "financialContextSnapshot": { ... },
      "disclaimer": "Finora AI provides educational guidance and scenario simulations..."
    }
    ```
- **`GET /api/v1/finora/coach/history?sessionId=session-123`**
  - Returns past conversation history.

### 3.3 Transaction Management & Correction Learning
- **`GET /api/v1/finora/transactions?type=EXPENSE&category=Food & Dining&page=0&size=20`**
  - Search, filter by date range, category, and text query.
- **`POST /api/v1/finora/transactions`**
  - Create manual transaction (automatically applies learned correction rules).
- **`PUT /api/v1/finora/transactions/{id}`**
  - Update existing transaction.
- **`DELETE /api/v1/finora/transactions/{id}`**
  - Delete transaction.
- **`POST /api/v1/finora/transactions/correct-category`**
  - **Living Memory Correction**: When user modifies a category and clicks *"Remember this correction for future similar transactions"*.
  - **Request Body**:
    ```json
    {
      "transactionId": 5,
      "newCategory": "Food & Dining",
      "rememberRule": true,
      "customMerchantPattern": "swiggy"
    }
    ```
- **`POST /api/v1/finora/transactions/upload`**
  - **Statement Parser**: Accepts raw CSV lines or SMS notifications, extracts transactions, auto-applies learned correction rules, and returns staged transactions.
  - **Request Body**:
    ```json
    {
      "fileType": "CSV",
      "rawContent": "Date,Description,Amount,Type\n2026-10-31,Swiggy Dinner,850.00,EXPENSE\n2026-10-31,Uber Ride,320.00,EXPENSE"
    }
    ```

### 3.4 Subscription Management
- **`GET /api/v1/finora/subscriptions`**
  - List all recurring subscriptions (Netflix, Spotify, ACT Fibernet, Cult.fit, etc.).
- **`GET /api/v1/finora/subscriptions/summary`**
  - Monthly recurring total, yearly estimate, price increase alerts, and potentially unused alerts.
- **`POST /api/v1/finora/subscriptions`**
  - Add subscription.
- **`PUT /api/v1/finora/subscriptions/{id}`**
  - Edit subscription.
- **`DELETE /api/v1/finora/subscriptions/{id}`**
  - Delete subscription.

### 3.5 Goal Planner & Dynamic What-If Simulator
- **`GET /api/v1/finora/goals`**
  - List financial goals with progress percentage, monthly contributions, and target dates.
- **`POST /api/v1/finora/goals`**
  - Create new goal (e.g. MacBook Pro M3, Emergency Fund Cushion, Goa Trip).
- **`POST /api/v1/finora/goals/{id}/contribute`**
  - Deposit funds into a goal.
- **`POST /api/v1/finora/simulation/run`**
  - **Dynamic What-If Calculation**:
  - **Request Body**:
    ```json
    {
      "categoryToReduce": "Food & Dining",
      "reductionPercentage": 30.0,
      "monthlyExpenseIncrease": 3000.00
    }
    ```
  - **Response**:
    ```json
    {
      "baselineMonthlyIncome": 65000.00,
      "baselineMonthlyExpenses": 38000.00,
      "baselineMonthlySavings": 27000.00,
      "baselineSavingsRate": 41.5,
      "simulatedCategoryExpense": 5950.00,
      "simulatedMonthlyExpenses": 38450.00,
      "simulatedMonthlySavings": 26550.00,
      "simulatedSavingsRate": 40.8,
      "monthlySavingsDelta": -450.00,
      "annualSavingsImpact": -5400.00,
      "goalImpacts": [
        {
          "goalName": "MacBook Pro M3",
          "baselineMonthsRemaining": 10,
          "simulatedMonthsRemaining": 10,
          "monthsSaved": 0,
          "baselineCompletionDate": "Aug 2027",
          "simulatedCompletionDate": "Aug 2027"
        }
      ],
      "aiScenarioObservation": "..."
    }
    ```

### 3.6 Financial Profile & Living Money Model
- **`GET /api/v1/finora/profile`**
  - Monthly income, emergency fund, target, currency, risk tolerance, and budget cap.
- **`PUT /api/v1/finora/profile`**
  - Edit profile locally or in database.
- **`GET /api/v1/finora/profile/income-sources`**
  - View individual income streams.
- **`POST /api/v1/finora/profile/income-sources`**
  - Add salary or freelance consulting stream.

### 3.7 Spending Analytics
- **`GET /api/v1/finora/analytics?year=2026`**
  - Multi-month trend points, category distribution, and month-over-month comparisons for Recharts.

### 3.8 Smart Alerts
- **`GET /api/v1/finora/alerts`**
  - All alerts.
- **`GET /api/v1/finora/alerts/unread`**
  - Unread alerts only.
- **`PATCH /api/v1/finora/alerts/{id}/read`**
  - Mark alert as read.
- **`POST /api/v1/finora/alerts/read-all`**
  - Mark all as read.

### 3.9 Monthly Financial Report
- **`GET /api/v1/finora/reports/monthly?year=2026&month=10`**
  - Printable financial summary, biggest outflow category, recurring total, next month's suggested budget, and health score.

---

## 4. How to Run & Test

1. **Start PostgreSQL**: Ensure PostgreSQL is running on port 5432 with your database.
2. **Start Spring Boot App**:
   ```bash
   ./mvnw.cmd spring-boot:run
   ```
3. **Verify Seed Data**:
   On first boot, `FinoraSeedData` will automatically populate the database with realistic INR sample data.
4. **Test Endpoints**:
   Run the included PowerShell script `test_finora_endpoints.ps1` or use cURL / Postman.
