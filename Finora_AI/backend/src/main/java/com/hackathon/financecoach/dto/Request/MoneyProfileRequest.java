package com.hackathon.financecoach.dto.Request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoneyProfileRequest {

  @NotNull(message = "Monthly income is required")
  @DecimalMin(value = "0.00", message = "Monthly income cannot be negative")
  private BigDecimal monthlyIncome;

  @Size(max = 50, message = "Employment status cannot exceed 50 characters")
  private String employmentStatus;

  @Size(max = 100, message = "Income source cannot exceed 100 characters")
  private String incomeSource;

  @NotNull(message = "Monthly fixed expenses are required")
  @DecimalMin(value = "0.00", message = "Fixed expenses cannot be negative")
  private BigDecimal monthlyFixedExpenses;

  @NotNull(message = "Monthly variable expenses are required")
  @DecimalMin(value = "0.00", message = "Variable expenses cannot be negative")
  private BigDecimal monthlyVariableExpenses;

  @NotNull(message = "Savings amount is required")
  @DecimalMin(value = "0.00", message = "Savings amount cannot be negative")
  private BigDecimal savingsAmount;

  @NotNull(message = "Existing debt is required")
  @DecimalMin(value = "0.00", message = "Debt cannot be negative")
  private BigDecimal existingDebt;

  private Integer financialDependents;

  @Size(max = 10, message = "Preferred currency cannot exceed 10 characters")
  private String preferredCurrency;

  @Size(max = 50, message = "Financial experience level cannot exceed 50 characters")
  private String financialExperienceLevel;

  @Size(max = 255, message = "Financial priorities cannot exceed 255 characters")
  private String financialPriorities;
}
