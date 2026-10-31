package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.model.TransactionCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionSummaryResponse {
  private Long totalActiveSubscriptions;
  private Long totalPausedSubscriptions;
  private Long totalCancelledSubscriptions;
  private BigDecimal totalMonthlyCost;
  private BigDecimal totalYearlyCost;
  private List<SubscriptionResponse> upcomingRenewals;
  private Map<TransactionCategory, BigDecimal> categoryExpenseBreakdown;
}
