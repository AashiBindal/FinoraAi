package com.hackathon.financecoach.dto.Request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePreferencesRequestDTO {
  @NotBlank(message = "Currency cannot be blank")
  private String currency;

  @NotNull(message = "Monthly income target is required")
  @Min(value = 0, message = "Monthly income target cannot be negative")
  private Double monthlyIncomeTarget;

  @NotNull(message = "Savings goal percentage is required")
  @Min(value = 0, message = "Savings goal percentage must be at least 0")
  @Max(value = 100, message = "Savings goal percentage cannot exceed 100")
  private Double savingsGoalPercentage;

  @NotBlank(message = "Risk preference cannot be blank")
  private String riskPreference; // e.g., CONSERVATIVE, MODERATE, AGGRESSIVE
}
