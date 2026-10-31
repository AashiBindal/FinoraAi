package com.hackathon.financecoach.dto.settings;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponseDTO {
  private Long id;
  private String fullName;
  private String email;
  private String currency;
  private Double monthlyIncomeTarget;
  private Double savingsGoalPercentage;
  private String riskPreference;
}
