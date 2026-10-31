package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.model.TransactionCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyReportResponse {
  private int year;
  private int month;
  private String monthName;

  // Summary
  private BigDecimal totalIncome;
  private BigDecimal totalExpenses;
  private BigDecimal netCashFlow;
  private BigDecimal totalSavings;
  private BigDecimal savingsRatePercentage;

  // Breakdowns
  private Map<TransactionCategory, BigDecimal> categoryExpenses;
  private Long incomeTransactionCount;
  private Long expenseTransactionCount;

  // Subscriptions & Goals Context
  private BigDecimal monthlyRecurringSubscriptionsCost;
  private Long activeGoalsCount;
  private BigDecimal goalProgressPercentage;

  // Comparisons & Highlights
  private MonthOverMonthComparison monthOverMonthComparison;
  private MonthlyHighlightResponse highlights;
  private String aiInsights;
}
