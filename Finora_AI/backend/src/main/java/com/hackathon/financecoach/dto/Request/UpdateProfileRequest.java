package com.hackathon.financecoach.dto.Request;

import com.hackathon.financecoach.model.RiskPreference;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateProfileRequest(

  @NotBlank(message = "Full name is required")
  @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
  String fullName,

  @Size(min = 3, max = 3, message = "Currency must be a 3-letter code")
  String currency,

  @DecimalMin(value = "0.0", message = "Monthly income cannot be negative")
  BigDecimal monthlyIncomeTarget,

  @DecimalMin(value = "0.0", message = "Savings goal cannot be below 0")
  @DecimalMax(value = "100.0", message = "Savings goal cannot exceed 100")
  BigDecimal savingsGoalPercent,

  RiskPreference riskPreference,

  @Size(max = 1000, message = "Financial goals text cannot exceed 1000 characters")
  String financialGoalsText
) {
}
