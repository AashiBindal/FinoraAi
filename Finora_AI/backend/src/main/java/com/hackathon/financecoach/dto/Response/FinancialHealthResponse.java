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
public class FinancialHealthResponse {
  private BigDecimal totalMonthlyIncome;
  private BigDecimal totalMonthlyExpenses;
  private BigDecimal monthlySavings;
  private BigDecimal savingsRatePercentage;
  private BigDecimal debtToIncomeRatioPercentage;
  private BigDecimal availableMonthlyBalance;
}
