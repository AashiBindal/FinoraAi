package com.hackathon.financecoach.dto.Request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalContributionRequest {

  @NotNull(message = "Contribution amount is required")
  @DecimalMin(value = "0.01", message = "Contribution amount must be greater than zero")
  private BigDecimal amount;
}
