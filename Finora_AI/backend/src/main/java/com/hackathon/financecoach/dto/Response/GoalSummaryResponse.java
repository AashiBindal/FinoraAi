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
public class GoalSummaryResponse {
  private Long totalGoals;
  private Long activeGoals;
  private Long completedGoals;
  private Long overdueGoals;
  private BigDecimal totalTargetAmount;
  private BigDecimal totalSavedAmount;
  private BigDecimal totalRemainingAmount;
  private BigDecimal overallProgressPercentage;
  private List<GoalResponse> upcomingDeadlines;
}
