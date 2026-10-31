package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardAnalyticsResponse {
  private FinancialOverviewResponse overview;
  private List<com.hackathon.financecoach.dto.response.TrendDataPoint> monthlyTrends;
  private CategorySpendingResponse categorySpending;
  private SubscriptionSummaryResponse subscriptionSummary;
  private GoalSummaryResponse goalSummary;
}
