package com.hackathon.financecoach.dto;

import com.hackathon.financecoach.entity.Budget;
import com.hackathon.financecoach.model.TransactionCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public class BudgetDTOs {

    public record BudgetRequest(
            @NotNull(message = "Month is required (e.g. YYYY-MM-01)")
            LocalDate month,

            TransactionCategory category, // Optional: null means "TOTAL" overall monthly budget

            @NotNull(message = "Limit amount is required")
            @DecimalMin(value = "0.01", message = "Limit amount must be greater than zero")
            BigDecimal limitAmount
    ) {}

    public record BudgetResponse(
            Long id,
            LocalDate month,
            TransactionCategory category,
            BigDecimal limitAmount,
            OffsetDateTime createdAt
    ) {
        public static BudgetResponse fromEntity(Budget b) {
            return new BudgetResponse(
                    b.getId(),
                    b.getMonth(),
                    b.getCategory(),
                    b.getLimitAmount(),
                    b.getCreatedAt()
            );
        }
    }

    public record BudgetStatusResponse(
            LocalDate month,
            BigDecimal overallBudget,
            BigDecimal overallSpent,
            BigDecimal overallRemaining,
            double overallUsagePercent,
            String overallStatus, // OK, WARNING, EXCEEDED
            List<CategoryBudgetStatusDTO> categoryBudgets,
            List<String> activeAlerts
    ) {}

    public record CategoryBudgetStatusDTO(
            Long id,
            TransactionCategory category,
            BigDecimal limitAmount,
            BigDecimal spentAmount,
            BigDecimal remainingAmount,
            double usagePercent,
            String status // OK, WARNING (>=80%), EXCEEDED (>=100%)
    ) {}
}
