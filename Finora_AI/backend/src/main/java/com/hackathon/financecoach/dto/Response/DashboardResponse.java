package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
  // Overview Metrics
  private BigDecimal totalIncome;
  private BigDecimal totalExpenses;
  private BigDecimal netCashFlow;
  private BigDecimal totalSavings;
  private BigDecimal savingsRatePercentage;
  private Long activeSubscriptionsCount;
  private BigDecimal activeSubscriptionsMonthlyCost;
  private Long totalActiveGoals;
  private BigDecimal overallGoalProgressPercentage;
  private int profileCompletionPercentage;

  // Detailed Widgets
  private List<TransactionResponse> recentTransactions;
  private List<SubscriptionResponse> upcomingRenewals;
  private List<GoalResponse> activeGoals;
  private AIInsightResponse aiInsights;
}
