package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.Request.MoneyProfileRequest;
import com.hackathon.financecoach.dto.Response.FinancialHealthResponse;
import com.hackathon.financecoach.dto.Response.MoneyProfileResponse;
import com.hackathon.financecoach.entity.MoneyProfile;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.repository.MoneyProfileRepository;
import com.hackathon.financecoach.repository.UserRepository;
import com.hackathon.financecoach.service.MoneyProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class MoneyProfileServiceImpl implements MoneyProfileService {

  private final MoneyProfileRepository moneyProfileRepository;
  private final UserRepository userRepository;

  @Override
  @Transactional
  public MoneyProfileResponse createOrUpdateProfile(Long userId, MoneyProfileRequest request) {
    User user = userRepository.findById(userId)
      .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

    MoneyProfile profile = moneyProfileRepository.findByUserId(userId)
      .orElse(MoneyProfile.builder().user(user).build());

    profile.setMonthlyIncome(request.getMonthlyIncome());
    profile.setEmploymentStatus(request.getEmploymentStatus());
    profile.setIncomeSource(request.getIncomeSource());
    profile.setMonthlyFixedExpenses(request.getMonthlyFixedExpenses());
    profile.setMonthlyVariableExpenses(request.getMonthlyVariableExpenses());
    profile.setSavingsAmount(request.getSavingsAmount());
    profile.setExistingDebt(request.getExistingDebt());
    profile.setFinancialDependents(request.getFinancialDependents());
    profile.setPreferredCurrency(request.getPreferredCurrency() != null ? request.getPreferredCurrency() : "INR");
    profile.setFinancialExperienceLevel(request.getFinancialExperienceLevel());
    profile.setFinancialPriorities(request.getFinancialPriorities());

    MoneyProfile savedProfile = moneyProfileRepository.save(profile);
    return mapToResponse(savedProfile);
  }

  @Override
  @Transactional(readOnly = true)
  public MoneyProfileResponse getProfileByUserId(Long userId) {
    MoneyProfile profile = moneyProfileRepository.findByUserId(userId)
      .orElseThrow(() -> new EntityNotFoundException("Money profile not found for user ID: " + userId));
    return mapToResponse(profile);
  }

  @Override
  @Transactional(readOnly = true)
  public FinancialHealthResponse getFinancialHealth(Long userId) {
    MoneyProfile profile = moneyProfileRepository.findByUserId(userId)
      .orElseThrow(() -> new EntityNotFoundException("Money profile not found for user ID: " + userId));

    BigDecimal income = profile.getMonthlyIncome();
    BigDecimal fixedExp = profile.getMonthlyFixedExpenses();
    BigDecimal varExp = profile.getMonthlyVariableExpenses();
    BigDecimal totalExpenses = fixedExp.add(varExp);
    BigDecimal monthlySavings = income.subtract(totalExpenses);
    BigDecimal availableBalance = monthlySavings;

    BigDecimal savingsRate = BigDecimal.ZERO;
    if (income.compareTo(BigDecimal.ZERO) > 0) {
      savingsRate = monthlySavings.multiply(BigDecimal.valueOf(100))
        .divide(income, 2, RoundingMode.HALF_UP);
    }

    BigDecimal debtToIncomeRatio = BigDecimal.ZERO;
    if (income.compareTo(BigDecimal.ZERO) > 0) {
      debtToIncomeRatio = profile.getExistingDebt().multiply(BigDecimal.valueOf(100))
        .divide(income.multiply(BigDecimal.valueOf(12)), 2, RoundingMode.HALF_UP);
    }

    return FinancialHealthResponse.builder()
      .totalMonthlyIncome(income)
      .totalMonthlyExpenses(totalExpenses)
      .monthlySavings(monthlySavings)
      .savingsRatePercentage(savingsRate)
      .debtToIncomeRatioPercentage(debtToIncomeRatio)
      .availableMonthlyBalance(availableBalance)
      .build();
  }

  @Override
  public int calculateProfileCompletion(MoneyProfile profile) {
    int totalFields = 10;
    int filledFields = 0;

    if (profile.getMonthlyIncome() != null && profile.getMonthlyIncome().compareTo(BigDecimal.ZERO) >= 0) filledFields++;
    if (profile.getEmploymentStatus() != null && !profile.getEmploymentStatus().trim().isEmpty()) filledFields++;
    if (profile.getIncomeSource() != null && !profile.getIncomeSource().trim().isEmpty()) filledFields++;
    if (profile.getMonthlyFixedExpenses() != null) filledFields++;
    if (profile.getMonthlyVariableExpenses() != null) filledFields++;
    if (profile.getSavingsAmount() != null) filledFields++;
    if (profile.getExistingDebt() != null) filledFields++;
    if (profile.getFinancialDependents() != null) filledFields++;
    if (profile.getFinancialExperienceLevel() != null && !profile.getFinancialExperienceLevel().trim().isEmpty()) filledFields++;
    if (profile.getFinancialPriorities() != null && !profile.getFinancialPriorities().trim().isEmpty()) filledFields++;

    return (filledFields * 100) / totalFields;
  }

  private MoneyProfileResponse mapToResponse(MoneyProfile profile) {
    return MoneyProfileResponse.builder()
      .id(profile.getId())
      .monthlyIncome(profile.getMonthlyIncome())
      .employmentStatus(profile.getEmploymentStatus())
      .incomeSource(profile.getIncomeSource())
      .monthlyFixedExpenses(profile.getMonthlyFixedExpenses())
      .monthlyVariableExpenses(profile.getMonthlyVariableExpenses())
      .savingsAmount(profile.getSavingsAmount())
      .existingDebt(profile.getExistingDebt())
      .financialDependents(profile.getFinancialDependents())
      .preferredCurrency(profile.getPreferredCurrency())
      .financialExperienceLevel(profile.getFinancialExperienceLevel())
      .financialPriorities(profile.getFinancialPriorities())
      .profileCompletionPercentage(calculateProfileCompletion(profile))
      .createdAt(profile.getCreatedAt())
      .updatedAt(profile.getUpdatedAt())
      .build();
  }
}
