package com.hackathon.financecoach.dto;

import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.RiskPreference;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class UserDTOs {

    public record UserProfileResponse(
            Long id,
            String fullName,
            String email,
            String currency,
            BigDecimal monthlyIncomeTarget,
            BigDecimal savingsGoalPercent,
            RiskPreference riskPreference,
            String financialGoalsText,
            OffsetDateTime createdAt
    ) {
        public static UserProfileResponse fromEntity(User user) {
            return new UserProfileResponse(
                    user.getId(),
                    user.getFullName(),
                    user.getEmail(),
                    user.getCurrency(),
                    user.getMonthlyIncomeTarget(),
                    user.getSavingsGoalPercent(),
                    user.getRiskPreference(),
                    user.getFinancialGoalsText(),
                    user.getCreatedAt()
            );
        }
    }

    public record UpdateProfileRequest(
            @NotBlank(message = "Full name is required")
            String fullName,

            String currency,

            @DecimalMin(value = "0.0", message = "Monthly income target cannot be negative")
            BigDecimal monthlyIncomeTarget,

            @DecimalMin(value = "0.0", message = "Savings goal percent cannot be negative")
            BigDecimal savingsGoalPercent,

            RiskPreference riskPreference,

            String financialGoalsText
    ) {}
}
