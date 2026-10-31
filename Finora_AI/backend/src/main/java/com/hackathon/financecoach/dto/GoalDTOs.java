package com.hackathon.financecoach.dto;

import com.hackathon.financecoach.entity.FinancialGoal;
import com.hackathon.financecoach.model.GoalStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public class GoalDTOs {

    public record GoalRequest(
            @NotBlank(message = "Goal name is required")
            String name,

            @NotNull(message = "Target amount is required")
            @DecimalMin(value = "1.0", message = "Target amount must be at least 1.00")
            BigDecimal targetAmount,

            BigDecimal savedAmount,

            @NotNull(message = "Target date is required")
            LocalDate targetDate,

            GoalStatus status
    ) {}

    public record GoalResponse(
            Long id,
            String name,
            BigDecimal targetAmount,
            BigDecimal savedAmount,
            LocalDate targetDate,
            GoalStatus status,
            double progressPercent,
            long monthsRemaining,
            BigDecimal requiredMonthlySaving,
            boolean onTrack,
            LocalDateTime createdAt
    ) {
        public static GoalResponse fromEntity(FinancialGoal g) {
            BigDecimal target = g.getTargetAmount();
            BigDecimal saved = g.getCurrentAmount() != null ? g.getCurrentAmount() : BigDecimal.ZERO;

            double progress = 0.0;
            if (target != null && target.compareTo(BigDecimal.ZERO) > 0) {
                progress = saved.multiply(new BigDecimal("100"))
                        .divide(target, 1, RoundingMode.HALF_UP).doubleValue();
            }

            LocalDate now = LocalDate.now();
            long months = Math.max(1, ChronoUnit.MONTHS.between(now.withDayOfMonth(1), g.getTargetDate().withDayOfMonth(1)));
            BigDecimal remaining = target.subtract(saved).max(BigDecimal.ZERO);
            BigDecimal reqMonthly = remaining.divide(BigDecimal.valueOf(months), 2, RoundingMode.CEILING);

            return new GoalResponse(
                    g.getId(),
                    g.getTitle(),
                    g.getTargetAmount(),
                    saved,
                    g.getTargetDate(),
                    g.getStatus(),
                    Math.min(100.0, progress),
                    months,
                    reqMonthly,
                    progress >= 50.0 || months >= 3,
                    g.getCreatedAt()
            );
        }
    }
}
