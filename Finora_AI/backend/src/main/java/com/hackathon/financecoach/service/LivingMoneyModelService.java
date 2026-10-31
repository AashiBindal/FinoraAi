package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.LivingMoneyModelDTOs.*;
import com.hackathon.financecoach.entity.*;
import com.hackathon.financecoach.model.GoalStatus;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import com.hackathon.financecoach.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LivingMoneyModelService {

    private final TransactionRepository transactionRepo;
    private final BudgetRepository budgetRepo;
    private final FinancialGoalRepository goalRepo;
    private final ModelSnapshotRepository snapshotRepo;
    private final UserRepository userRepo;
    private final ObjectMapper objectMapper;

    public record ModelRefreshEvent(Long userId) {}

    @Transactional(readOnly = true)
    public LivingMoneyModel getLivingModel(User user, LocalDate targetMonth) {
        if (targetMonth == null) targetMonth = LocalDate.now().withDayOfMonth(1);
        else targetMonth = targetMonth.withDayOfMonth(1);

        return computeModel(user, targetMonth);
    }

    @Transactional
    public LivingMoneyModel computeAndPersistSnapshot(User user, LocalDate targetMonth) {
        LivingMoneyModel model = computeModel(user, targetMonth);
        try {
            String json = objectMapper.writeValueAsString(model);
            ModelSnapshot snapshot = snapshotRepo.findByUserId(user.getId())
                    .orElseGet(() -> ModelSnapshot.builder().user(user).build());
            snapshot.setModelJson(json);
            snapshot.setUpdatedAt(OffsetDateTime.now());
            snapshotRepo.save(snapshot);
        } catch (Exception e) {
            log.error("Failed to persist model snapshot for user {}: {}", user.getId(), e.getMessage());
        }
        return model;
    }

    @Async
    @EventListener
    @Transactional
    public void handleModelRefresh(ModelRefreshEvent event) {
        log.info("Refreshing Living Money Model snapshot for user id: {}", event.userId());
        userRepo.findById(event.userId()).ifPresent(u -> computeAndPersistSnapshot(u, LocalDate.now().withDayOfMonth(1)));
    }

    private LivingMoneyModel computeModel(User user, LocalDate targetMonth) {
        LocalDate startOfMonth = targetMonth.withDayOfMonth(1);
        LocalDate endOfMonth = targetMonth.withDayOfMonth(targetMonth.lengthOfMonth());

        // 1. Current Month Totals
        BigDecimal currentIncome = transactionRepo.sumAmountByUserIdAndTypeAndDateBetween(
                user.getId(), TransactionType.INCOME, startOfMonth, endOfMonth
        );
        if (currentIncome == null) currentIncome = BigDecimal.ZERO;

        BigDecimal currentExpenses = transactionRepo.sumAmountByUserIdAndTypeAndDateBetween(
                user.getId(), TransactionType.EXPENSE, startOfMonth, endOfMonth
        );
        if (currentExpenses == null) currentExpenses = BigDecimal.ZERO;

        BigDecimal netSavings = currentIncome.subtract(currentExpenses);

        double savingsRate = 0.0;
        if (currentIncome.compareTo(BigDecimal.ZERO) > 0) {
            savingsRate = netSavings.multiply(new BigDecimal("100"))
                    .divide(currentIncome, 1, RoundingMode.HALF_UP).doubleValue();
        }

        // 2. All-Time Available Balance (All-Time Income - All-Time Expenses)
        BigDecimal allTimeIncome = transactionRepo.sumAllTimeAmountByUserIdAndType(user.getId(), TransactionType.INCOME);
        BigDecimal allTimeExpense = transactionRepo.sumAllTimeAmountByUserIdAndType(user.getId(), TransactionType.EXPENSE);
        if (allTimeIncome == null) allTimeIncome = BigDecimal.ZERO;
        if (allTimeExpense == null) allTimeExpense = BigDecimal.ZERO;
        BigDecimal availableBalance = allTimeIncome.subtract(allTimeExpense);

        // 3. Category Breakdown for Target Month
        var projections = transactionRepo.findCategorySpendBetween(user.getId(), startOfMonth, endOfMonth);
        List<CategoryBreakdownDTO> categoryBreakdown = new ArrayList<>();
        List<TransactionCategory> top3 = new ArrayList<>();

        // Previous month for Month-over-Month calculation
        LocalDate prevMonthStart = startOfMonth.minusMonths(1);
        LocalDate prevMonthEnd = prevMonthStart.withDayOfMonth(prevMonthStart.lengthOfMonth());
        var prevProjections = transactionRepo.findCategorySpendBetween(user.getId(), prevMonthStart, prevMonthEnd);
        Map<TransactionCategory, BigDecimal> prevCatMap = new HashMap<>();
        for (var p : prevProjections) {
            prevCatMap.put(p.getCategory(), p.getTotal());
        }

        Map<TransactionCategory, String> colorMap = Map.ofEntries(
                Map.entry(TransactionCategory.RENT, "#6366f1"),
                Map.entry(TransactionCategory.FOOD, "#ec4899"),
                Map.entry(TransactionCategory.TRANSPORT, "#3b82f6"),
                Map.entry(TransactionCategory.UTILITIES, "#10b981"),
                Map.entry(TransactionCategory.ENTERTAINMENT, "#f59e0b"),
                Map.entry(TransactionCategory.SHOPPING, "#8b5cf6"),
                Map.entry(TransactionCategory.HEALTH, "#14b8a6"),
                Map.entry(TransactionCategory.EDUCATION, "#06b6d4"),
                Map.entry(TransactionCategory.INVESTMENT, "#10b981"),
                Map.entry(TransactionCategory.SUBSCRIPTIONS, "#f43f5e"),
                Map.entry(TransactionCategory.OTHER, "#94a3b8")
        );

        for (var p : projections) {
            double pct = currentExpenses.compareTo(BigDecimal.ZERO) > 0
                    ? p.getTotal().multiply(new BigDecimal("100")).divide(currentExpenses, 1, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;

            BigDecimal prevAmount = prevCatMap.getOrDefault(p.getCategory(), BigDecimal.ZERO);
            double momChange = 0.0;
            if (prevAmount.compareTo(BigDecimal.ZERO) > 0) {
                momChange = p.getTotal().subtract(prevAmount).multiply(new BigDecimal("100"))
                        .divide(prevAmount, 1, RoundingMode.HALF_UP).doubleValue();
            }

            categoryBreakdown.add(CategoryBreakdownDTO.builder()
                    .category(p.getCategory())
                    .amount(p.getTotal())
                    .percentageOfExpenses(pct)
                    .monthOverMonthChangePercent(momChange)
                    .color(colorMap.getOrDefault(p.getCategory(), "#64748b"))
                    .build());

            if (top3.size() < 3) {
                top3.add(p.getCategory());
            }
        }

        // 4. Budgets & Utilization
        List<Budget> budgets = budgetRepo.findByUserIdAndMonth(user.getId(), startOfMonth);
        List<BudgetUtilizationDTO> budgetUtilList = new ArrayList<>();
        BudgetUtilizationDTO overallStatus = null;
        List<AlertDTO> alerts = new ArrayList<>();

        Map<TransactionCategory, BigDecimal> catSpendMap = new HashMap<>();
        for (var p : projections) {
            catSpendMap.put(p.getCategory(), p.getTotal());
        }

        for (Budget b : budgets) {
            BigDecimal spent = b.getCategory() == null
                    ? currentExpenses
                    : catSpendMap.getOrDefault(b.getCategory(), BigDecimal.ZERO);

            BigDecimal remaining = b.getLimitAmount().subtract(spent);
            double usage = b.getLimitAmount().compareTo(BigDecimal.ZERO) > 0
                    ? spent.multiply(new BigDecimal("100")).divide(b.getLimitAmount(), 1, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;

            String status = "OK";
            if (usage >= 100.0) {
                status = "EXCEEDED";
                alerts.add(AlertDTO.builder()
                        .type("BUDGET_EXCEEDED")
                        .severity("HIGH")
                        .title(String.format("%s Budget Exceeded", b.getCategory() != null ? b.getCategory().name() : "Overall"))
                        .description(String.format("You have spent ₹%,.2f out of ₹%,.2f allocated (%.1f%%).", spent, b.getLimitAmount(), usage))
                        .suggestedAction("Pause non-essential transactions in this category for the remainder of the month.")
                        .build());
            } else if (usage >= 80.0) {
                status = "WARNING";
                alerts.add(AlertDTO.builder()
                        .type("BUDGET_WARNING")
                        .severity("MEDIUM")
                        .title(String.format("%s Budget Nearing Limit", b.getCategory() != null ? b.getCategory().name() : "Overall"))
                        .description(String.format("You have reached %.1f%% of your budget (₹%,.2f remaining).", usage, remaining))
                        .suggestedAction("Monitor daily burn rate to avoid overspending.")
                        .build());
            }

            BudgetUtilizationDTO dto = BudgetUtilizationDTO.builder()
                    .budgetId(b.getId())
                    .category(b.getCategory())
                    .limitAmount(b.getLimitAmount())
                    .spentAmount(spent)
                    .remainingAmount(remaining)
                    .usagePercentage(usage)
                    .status(status)
                    .build();

            if (b.getCategory() == null) {
                overallStatus = dto;
            } else {
                budgetUtilList.add(dto);
            }
        }

        // 5. Goal Tracking
        List<FinancialGoal> goals = goalRepo.findByUserIdOrderByTargetDateAsc(user.getId());
        List<GoalTrackingDTO> goalTrackingList = new ArrayList<>();
        LocalDate now = LocalDate.now();

        for (FinancialGoal g : goals) {
            double progress = 0.0;
            if (g.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
                progress = g.getCurrentAmount().multiply(new BigDecimal("100"))
                        .divide(g.getTargetAmount(), 1, RoundingMode.HALF_UP).doubleValue();
            }

            long monthsRemaining = Math.max(1, ChronoUnit.MONTHS.between(now.withDayOfMonth(1), g.getTargetDate().withDayOfMonth(1)));
            BigDecimal remainingGoal = g.getTargetAmount().subtract(g.getCurrentAmount()).max(BigDecimal.ZERO);
            BigDecimal requiredMonthly = remainingGoal.divide(BigDecimal.valueOf(monthsRemaining), 2, RoundingMode.CEILING);

            boolean onTrack = (g.getStatus() == GoalStatus.COMPLETED) || (progress >= 30.0 && netSavings.compareTo(requiredMonthly) >= 0);

            goalTrackingList.add(GoalTrackingDTO.builder()
                    .goalId(g.getId())
                    .name(g.getTitle())
                    .targetAmount(g.getTargetAmount())
                    .savedAmount(g.getCurrentAmount())
                    .progressPercent(Math.min(100.0, progress))
                    .requiredMonthlySaving(requiredMonthly)
                    .onTrack(onTrack)
                    .targetDate(g.getTargetDate().toString())
                    .build());
        }

        // 6. Multi-Month Trend (Last 6 Months) & 3-Month Moving Averages
        List<MonthlyTrendPointDTO> trends = new ArrayList<>();
        BigDecimal sum3MIncome = BigDecimal.ZERO;
        BigDecimal sum3MExpense = BigDecimal.ZERO;
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("MMM yyyy");

        for (int i = 5; i >= 0; i--) {
            LocalDate mStart = targetMonth.minusMonths(i).withDayOfMonth(1);
            LocalDate mEnd = mStart.withDayOfMonth(mStart.lengthOfMonth());

            BigDecimal inc = transactionRepo.sumAmountByUserIdAndTypeAndDateBetween(user.getId(), TransactionType.INCOME, mStart, mEnd);
            BigDecimal exp = transactionRepo.sumAmountByUserIdAndTypeAndDateBetween(user.getId(), TransactionType.EXPENSE, mStart, mEnd);
            if (inc == null) inc = BigDecimal.ZERO;
            if (exp == null) exp = BigDecimal.ZERO;
            BigDecimal sav = inc.subtract(exp);

            double rate = 0.0;
            if (inc.compareTo(BigDecimal.ZERO) > 0) {
                rate = sav.multiply(new BigDecimal("100")).divide(inc, 1, RoundingMode.HALF_UP).doubleValue();
            }

            trends.add(new MonthlyTrendPointDTO(mStart.format(dtf), inc, exp, sav, rate));

            if (i < 3) {
                sum3MIncome = sum3MIncome.add(inc);
                sum3MExpense = sum3MExpense.add(exp);
            }
        }

        BigDecimal avgIncome3M = sum3MIncome.divide(new BigDecimal("3"), 2, RoundingMode.HALF_UP);
        BigDecimal avgExpense3M = sum3MExpense.divide(new BigDecimal("3"), 2, RoundingMode.HALF_UP);
        BigDecimal burnRate = avgExpense3M.compareTo(BigDecimal.ZERO) > 0 ? avgExpense3M : currentExpenses;

        double runway = burnRate.compareTo(BigDecimal.ZERO) > 0
                ? availableBalance.divide(burnRate, 1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        // 7. Spending Projection (Linear Extrapolation of current month)
        int dayOfMonth = Math.max(1, now.getDayOfMonth());
        int totalDaysInMonth = targetMonth.lengthOfMonth();
        BigDecimal dailyRunRate = currentExpenses.divide(BigDecimal.valueOf(dayOfMonth), 2, RoundingMode.HALF_UP);
        BigDecimal projectedMonthExpenses = dailyRunRate.multiply(BigDecimal.valueOf(totalDaysInMonth)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal projectedMonthBalance = currentIncome.subtract(projectedMonthExpenses);

        if (projectedMonthBalance.compareTo(BigDecimal.ZERO) < 0) {
            alerts.add(AlertDTO.builder()
                    .type("NEGATIVE_PROJECTED_BALANCE")
                    .severity("CRITICAL")
                    .title("Negative Projected Balance Alert")
                    .description(String.format("At your current daily spending pace (₹%,.2f/day), end-of-month expenses will reach ₹%,.2f, creating a deficit.",
                            dailyRunRate, projectedMonthExpenses))
                    .suggestedAction("Slow down discretionary outflows immediately to preserve positive cashflow.")
                    .build());
        }

        // 8. Transaction Anomalies (> 2.5x Category Average)
        List<AnomalyDTO> anomalies = new ArrayList<>();
        List<Transaction> monthTx = transactionRepo.findByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
                user.getId(), startOfMonth, endOfMonth
        );

        for (Transaction t : monthTx) {
            if (t.getType() == TransactionType.EXPENSE) {
                BigDecimal catAvg = transactionRepo.findAverageAmountByCategory(user.getId(), t.getCategory());
                if (catAvg != null && catAvg.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal threshold = catAvg.multiply(new BigDecimal("2.5"));
                    if (t.getAmount().compareTo(threshold) > 0) {
                        double multiplier = t.getAmount().divide(catAvg, 1, RoundingMode.HALF_UP).doubleValue();
                        anomalies.add(AnomalyDTO.builder()
                                .transactionId(t.getId())
                                .description(t.getTitle())
                                .amount(t.getAmount())
                                .category(t.getCategory())
                                .categoryAverage(catAvg.setScale(2, RoundingMode.HALF_UP))
                                .multiplier(multiplier)
                                .transactionDate(t.getTransactionDate().toString())
                                .build());

                        alerts.add(AlertDTO.builder()
                                .type("UNUSUAL_TRANSACTION")
                                .severity("MEDIUM")
                                .title(String.format("Unusual %s Expense Detected", t.getCategory().name()))
                                .description(String.format("Transaction '%s' (₹%,.2f) is %.1fx higher than your average %s purchase (₹%,.2f).",
                                        t.getTitle(), t.getAmount(), multiplier, t.getCategory().name(), catAvg))
                                .suggestedAction("Verify if this was a planned one-off expense or recurring charge.")
                                .build());
                    }
                }
            }
        }

        // Low savings rate alert
        if (savingsRate < 20.0 && currentIncome.compareTo(BigDecimal.ZERO) > 0) {
            alerts.add(AlertDTO.builder()
                    .type("LOW_SAVINGS_RATE")
                    .severity("HIGH")
                    .title("Low Savings Rate Warning")
                    .description(String.format("Current monthly savings rate is %.1f%%, below the recommended 20%% benchmark.", savingsRate))
                    .suggestedAction("Review discretionary shopping and dining allocations.")
                    .build());
        }

        // 9. Financial Health Score (0 - 100)
        HealthScoreDTO health = computeHealthScore(savingsRate, budgetUtilList, runway, goalTrackingList);

        return LivingMoneyModel.builder()
                .currency(user.getCurrency() != null ? user.getCurrency() : "INR")
                .generatedAt(OffsetDateTime.now())
                .totalIncome(currentIncome)
                .totalExpenses(currentExpenses)
                .netSavings(netSavings)
                .savingsRate(savingsRate)
                .availableBalance(availableBalance)
                .categoryBreakdown(categoryBreakdown)
                .top3Categories(top3)
                .budgetUtilization(budgetUtilList)
                .overallBudgetStatus(overallStatus)
                .goalTracking(goalTrackingList)
                .averageMonthlyIncome3M(avgIncome3M)
                .averageMonthlyExpense3M(avgExpense3M)
                .monthlyBurnRate(burnRate)
                .runwayMonths(runway)
                .spendingTrends(trends)
                .projectedEndOfMonthExpenses(projectedMonthExpenses)
                .projectedEndOfMonthBalance(projectedMonthBalance)
                .anomalies(anomalies)
                .alerts(alerts)
                .healthScore(health)
                .build();
    }

    private HealthScoreDTO computeHealthScore(
            double savingsRate,
            List<BudgetUtilizationDTO> budgets,
            double runwayMonths,
            List<GoalTrackingDTO> goals
    ) {
        // Savings Score (0-25)
        int sScore = 5;
        if (savingsRate >= 35.0) sScore = 25;
        else if (savingsRate >= 25.0) sScore = 22;
        else if (savingsRate >= 20.0) sScore = 19;
        else if (savingsRate >= 10.0) sScore = 13;

        // Budget Adherence (0-25)
        int bScore = 25;
        for (BudgetUtilizationDTO b : budgets) {
            if ("EXCEEDED".equals(b.getStatus())) bScore -= 8;
            else if ("WARNING".equals(b.getStatus())) bScore -= 3;
        }
        bScore = Math.max(5, Math.min(25, bScore));

        // Liquidity / Runway (0-25)
        int rScore = 5;
        if (runwayMonths >= 6.0) rScore = 25;
        else if (runwayMonths >= 3.0) rScore = 20;
        else if (runwayMonths >= 1.5) rScore = 14;
        else if (runwayMonths >= 1.0) rScore = 10;

        // Goal Momentum (0-25)
        int gScore = 15;
        long onTrackCount = goals.stream().filter(GoalTrackingDTO::isOnTrack).count();
        if (!goals.isEmpty() && onTrackCount == goals.size()) gScore = 25;
        else if (onTrackCount > 0) gScore = 20;

        int total = sScore + bScore + rScore + gScore;
        total = Math.max(0, Math.min(100, total));

        String label;
        String summary;
        if (total >= 85) {
            label = "Excellent";
            summary = "Outstanding financial vitals with robust runway and high savings discipline.";
        } else if (total >= 70) {
            label = "Healthy";
            summary = "Solid baseline with healthy cash flow and controlled category spending.";
        } else if (total >= 50) {
            label = "Needs Attention";
            summary = "Positive cash flow exists, but budget overruns or liquidity buffers need active focus.";
        } else {
            label = "Critical";
            summary = "High spending burn is eroding savings. Prioritize essential commitments immediately.";
        }

        return HealthScoreDTO.builder()
                .score(total)
                .label(label)
                .savingsScore(sScore)
                .budgetAdherenceScore(bScore)
                .expenseStabilityScore(rScore)
                .goalProgressScore(gScore)
                .summary(summary)
                .build();
    }
}
