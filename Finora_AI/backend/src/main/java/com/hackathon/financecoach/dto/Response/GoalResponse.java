package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalResponse {
  private Long id;
  private String title;
  private String description;
  private BigDecimal targetAmount;
  private BigDecimal currentAmount;
  private BigDecimal remainingAmount;
  private BigDecimal progressPercentage;
  private GoalCategory category;
  private LocalDate targetDate;
  private String priority;
  private GoalStatus status;
  private BigDecimal monthlyContributionTarget;
  private BigDecimal requiredMonthlyContribution;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
