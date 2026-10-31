package com.hackathon.financecoach.dto;

import com.hackathon.financecoach.model.TransactionCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class LivingMoneyModelDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LivingMoneyModel {
        private String currency;
        private OffsetDateTime generatedAt;

        // Current Month Core Figures
        private BigDecimal totalIncome;
        private BigDecimal totalExpenses;
        private BigDecimal netSavings;
        private double savingsRate; // percentage (e.g. 41.5)
        private BigDecimal availableBalance; // all-time income - all-time expenses

        // Category Breakdown
        private List<CategoryBreakdownDTO> categoryBreakdown;
        private List<TransactionCategory> top3Categories;

        // Budgets
        private List<BudgetUtilizationDTO> budgetUtilization;
        private BudgetUtilizationDTO overallBudgetStatus;

        // Goals
        private List<GoalTrackingDTO> goalTracking;

        // Multi-month Averages & Runway
        private BigDecimal averageMonthlyIncome3M;
        private BigDecimal averageMonthlyExpense3M;
        private BigDecimal monthlyBurnRate;
        private double runwayMonths;

        // Trend & Projection
        private List<MonthlyTrendPointDTO> spendingTrends;
        private BigDecimal projectedEndOfMonthExpenses;
        private BigDecimal projectedEndOfMonthBalance;

        // Anomalies & Alerts
        private List<AnomalyDTO> anomalies;
        private List<AlertDTO> alerts;

        // Health Score
        private HealthScoreDTO healthScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryBreakdownDTO {
        private TransactionCategory category;
        private BigDecimal amount;
        private double percentageOfExpenses;
        private double monthOverMonthChangePercent;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BudgetUtilizationDTO {
        private Long budgetId;
        private TransactionCategory category; // null for total
        private BigDecimal limitAmount;
        private BigDecimal spentAmount;
        private BigDecimal remainingAmount;
        private double usagePercentage;
        private String status; // "OK", "WARNING" (>=80%), "EXCEEDED" (>=100%)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalTrackingDTO {
        private Long goalId;
        private String name;
        private BigDecimal targetAmount;
        private BigDecimal savedAmount;
        private double progressPercent;
        private BigDecimal requiredMonthlySaving;
        private boolean onTrack;
        private String targetDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTrendPointDTO {
        private String month; // e.g. "2026-07" or "Jul"
        private BigDecimal income;
        private BigDecimal expenses;
        private BigDecimal savings;
        private double savingsRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnomalyDTO {
        private Long transactionId;
        private String description;
        private BigDecimal amount;
        private TransactionCategory category;
        private BigDecimal categoryAverage;
        private double multiplier; // e.g. 3.2x average
        private String transactionDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlertDTO {
        private String type; // "BUDGET_EXCEEDED", "BUDGET_WARNING", "LOW_SAVINGS_RATE", "NEGATIVE_PROJECTED_BALANCE", "UNUSUAL_TRANSACTION"
        private String severity; // "LOW", "MEDIUM", "HIGH", "CRITICAL"
        private String title;
        private String description;
        private String suggestedAction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HealthScoreDTO {
        private int score; // 0 - 100
        private String label; // "Healthy", "Needs Attention", "Excellent", "Fair"
        private int savingsScore; // 0-25
        private int budgetAdherenceScore; // 0-25
        private int expenseStabilityScore; // 0-25
        private int goalProgressScore; // 0-25
        private String summary;
    }
}
