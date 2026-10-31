package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoneyProfileResponse {
  private Long id;
  private BigDecimal monthlyIncome;
  private String employmentStatus;
  private String incomeSource;
  private BigDecimal monthlyFixedExpenses;
  private BigDecimal monthlyVariableExpenses;
  private BigDecimal savingsAmount;
  private BigDecimal existingDebt;
  private Integer financialDependents;
  private String preferredCurrency;
  private String financialExperienceLevel;
  private String financialPriorities;
  private int profileCompletionPercentage;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
