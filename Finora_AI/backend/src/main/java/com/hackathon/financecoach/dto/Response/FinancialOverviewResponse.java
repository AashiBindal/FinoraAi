package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialOverviewResponse {
  private BigDecimal totalIncome;
  private BigDecimal totalExpenses;
  private BigDecimal netCashFlow;
  private BigDecimal totalSavings;
  private BigDecimal savingsRatePercentage;
  private BigDecimal activeSubscriptionsMonthlyCost;
  private Long totalGoals;
  private BigDecimal overallGoalProgressPercentage;
}
