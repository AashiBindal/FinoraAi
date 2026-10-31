package com.hackathon.financecoach.ai;

import com.hackathon.financecoach.dto.LivingMoneyModelDTOs.*;
import com.hackathon.financecoach.entity.Budget;
import com.hackathon.financecoach.entity.FinancialGoal;
import com.hackathon.financecoach.entity.Transaction;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.repository.BudgetRepository;
import com.hackathon.financecoach.repository.FinancialGoalRepository;
import com.hackathon.financecoach.repository.TransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class FinancialContextBuilder {

    private final TransactionRepository transactionRepo;
    private final BudgetRepository budgetRepo;
    private final FinancialGoalRepository goalRepo;
    private final ObjectMapper objectMapper;

    public String buildContextJson(User user, LivingMoneyModel model) {
        try {
            LocalDate now = LocalDate.now();
            LocalDate ninetyDaysAgo = now.minusDays(90);

            // 1. Last 90 days category aggregates
            var ninetyDaySpend = transactionRepo.findCategorySpendBetween(user.getId(), ninetyDaysAgo, now);

            // 2. Top 15 recent transactions
            List<Transaction> recentTransactions = transactionRepo.findByUserIdOrderByTransactionDateDesc(
                    user.getId(), PageRequest.of(0, 15)
            );

            List<Map<String, Object>> recentTxList = recentTransactions.stream().map(t -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("date", t.getTransactionDate().toString());
                m.put("type", t.getType().name());
                m.put("category", t.getCategory().name());
                m.put("amount", t.getAmount());
                m.put("description", t.getTitle());
                return m;
            }).toList();

            // 3. Active Budgets
            LocalDate currentMonth = now.withDayOfMonth(1);
            List<Budget> budgets = budgetRepo.findByUserIdAndMonth(user.getId(), currentMonth);
            List<Map<String, Object>> budgetList = budgets.stream().map(b -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("category", b.getCategory() != null ? b.getCategory().name() : "TOTAL");
                m.put("limit", b.getLimitAmount());
                return m;
            }).toList();

            // 4. Goals
            List<FinancialGoal> goals = goalRepo.findByUserIdOrderByTargetDateAsc(user.getId());
            List<Map<String, Object>> goalList = goals.stream().map(g -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name", g.getTitle());
                m.put("target", g.getTargetAmount());
                m.put("saved", g.getCurrentAmount());
                m.put("deadline", g.getTargetDate().toString());
                return m;
            }).toList();

            // Assemble Root Context
            Map<String, Object> context = new LinkedHashMap<>();
            context.put("user_currency", user.getCurrency());
            context.put("user_monthly_income_target", user.getMonthlyIncomeTarget());
            context.put("user_savings_goal_percent", user.getSavingsGoalPercent());
            context.put("user_risk_preference", user.getRiskPreference().name());

            // Core model numbers
            Map<String, Object> modelData = new LinkedHashMap<>();
            modelData.put("current_month_income", model.getTotalIncome());
            modelData.put("current_month_expenses", model.getTotalExpenses());
            modelData.put("current_month_net_savings", model.getNetSavings());
            modelData.put("savings_rate_percent", model.getSavingsRate());
            modelData.put("available_cumulative_balance", model.getAvailableBalance());
            modelData.put("runway_months", model.getRunwayMonths());
            modelData.put("financial_health_score", model.getHealthScore() != null ? model.getHealthScore().getScore() : 0);
            context.put("living_money_model", modelData);

            // Active category breakdown
            context.put("active_month_category_expenses", model.getCategoryBreakdown());
            context.put("ninety_days_category_totals", ninetyDaySpend);
            context.put("recent_transactions", recentTxList);
            context.put("budgets", budgetList);
            context.put("goals", goalList);
            context.put("active_alerts", model.getAlerts());

            return objectMapper.writeValueAsString(context);
        } catch (Exception ex) {
            log.error("Failed to build financial context JSON: {}", ex.getMessage());
            return "{}";
        }
    }
}
