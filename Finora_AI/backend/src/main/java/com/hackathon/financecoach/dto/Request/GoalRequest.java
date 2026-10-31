package com.hackathon.financecoach.dto.Request;

import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalRequest {

  @NotBlank(message = "Goal title is required")
  @Size(max = 255, message = "Title cannot exceed 255 characters")
  private String title;

  @Size(max = 500, message = "Description cannot exceed 500 characters")
  private String description;

  @NotNull(message = "Target amount is required")
  @DecimalMin(value = "0.01", message = "Target amount must be greater than zero")
  private BigDecimal targetAmount;

  @DecimalMin(value = "0.00", message = "Current amount cannot be negative")
  private BigDecimal currentAmount;

  @NotNull(message = "Goal category is required")
  private GoalCategory category;

  @NotNull(message = "Target date is required")
  private LocalDate targetDate;

  private String priority;

  private GoalStatus status;

  @DecimalMin(value = "0.00", message = "Monthly contribution target cannot be negative")
  private BigDecimal monthlyContributionTarget;
}
