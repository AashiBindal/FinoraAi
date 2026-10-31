package com.hackathon.financecoach.dto;

import com.hackathon.financecoach.model.TransactionCategory;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class AiDTOs {

    public record ChatRequest(
            @NotBlank(message = "Message cannot be blank")
            String message
    ) {}

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatResponse {
        private String reply;
        private String source; // "LLM" or "FALLBACK_RULE_BASED"
        private String model;
        private OffsetDateTime generatedAt;
        private String dataUsed;
        private String notice;
        private List<String> suggestedFollowUps;
        private String disclaimer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiInsightResponse {
        private String summary;
        private List<String> keyFindings;
        private String topOutflowCategory;
        private BigDecimal topOutflowAmount;
        private double savingsRate;
        private String source;
        private String model;
        private OffsetDateTime generatedAt;
        private String dataUsed;
        private String notice;
        private String disclaimer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiAnalysisResponse {
        private String summary;
        private List<UnnecessaryExpenseDTO> unnecessaryExpenses;
        private List<String> spendingPatterns;
        private List<String> subscriptionCreepAlerts;
        private List<SavingsStrategyDTO> savingsStrategies;
        private String riskLevel; // "LOW", "MODERATE", "HIGH"
        private String source;
        private String model;
        private OffsetDateTime generatedAt;
        private String dataUsed;
        private String notice;
        private String rawResponse;
        private String disclaimer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnnecessaryExpenseDTO {
        private TransactionCategory category;
        private BigDecimal amount;
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SavingsStrategyDTO {
        private String strategyName;
        private BigDecimal potentialMonthlySaving;
        private String actionableStep;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiBudgetSuggestionResponse {
        private String summary;
        private BigDecimal recommendedTotalBudget;
        private List<RecommendedBudgetDTO> recommendedBudgets;
        private String methodology; // e.g. "50/30/20 Rule Adapted to Real History"
        private String source;
        private String model;
        private OffsetDateTime generatedAt;
        private String dataUsed;
        private String notice;
        private String disclaimer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedBudgetDTO {
        private TransactionCategory category;
        private BigDecimal limit;
        private String rationale;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiForecastResponse {
        private String summary;
        private int forecastMonths;
        private List<ForecastMonthDTO> monthlyForecasts;
        private BigDecimal baselineMonthlyNetSavings;
        private String aiProjectionNarrative;
        private List<String> recommendations;
        private String source;
        private String model;
        private OffsetDateTime generatedAt;
        private String dataUsed;
        private String notice;
        private String disclaimer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForecastMonthDTO {
        private String month;
        private BigDecimal projectedIncome;
        private BigDecimal projectedExpenses;
        private BigDecimal projectedNetSavings;
        private BigDecimal projectedCumulativeBalance;
    }
}
