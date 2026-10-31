package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.RiskPreference;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserProfileResponse(

  Long id,
  String fullName,
  String email,
  String currency,
  BigDecimal monthlyIncomeTarget,
  BigDecimal savingsGoalPercent,
  RiskPreference riskPreference,
  String financialGoalsText,
  LocalDateTime createdAt
) {

  public static UserProfileResponse fromEntity(User user) {
    return new UserProfileResponse(
      user.getId(),
      user.getFullName(),
      user.getEmail(),
      user.getCurrency(),
      user.getMonthlyIncomeTarget(),
      user.getSavingsGoalPercent(),
      user.getRiskPreference(),
      user.getFinancialGoalsText(),
      user.getCreatedAt().toLocalDateTime()
    );
  }
}
