package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.Response.*;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.service.AnalyticsService;
import com.hackathon.financecoach.service.GoalService;
import com.hackathon.financecoach.service.MoneyProfileService;
import com.hackathon.financecoach.service.SubscriptionService;
import com.hackathon.financecoach.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

  private final TransactionService transactionService;
  private final SubscriptionService subscriptionService;
  private final MoneyProfileService moneyProfileService;
  private final GoalService goalService;

  @Override
  @Transactional(readOnly = true)
  public FinancialOverviewResponse getFinancialOverview(Long userId, LocalDate startDate, LocalDate endDate) {
    TransactionSummaryResponse txSummary = transactionService.getTransactionSummary(userId, startDate, endDate);
    SubscriptionSummaryResponse subSummary = subscriptionService.getSubscriptionSummary(userId);
    GoalSummaryResponse goalSummary = goalService.getGoalSummary(userId);

    BigDecimal totalIncome = txSummary.getTotalIncome();
    BigDecimal totalExpenses = txSummary.getTotalExpense();
    BigDecimal netCashFlow = txSummary.getCurrentBalance();

    BigDecimal totalSavings = BigDecimal.ZERO;
    BigDecimal savingsRate = BigDecimal.ZERO;
    try {
      MoneyProfileResponse profile = moneyProfileService.getProfileByUserId(userId);
      totalSavings = profile.getSavingsAmount();
      if (totalIncome.compareTo(BigDecimal.ZERO) > 0) {
        savingsRate = netCashFlow.max(BigDecimal.ZERO)
          .multiply(BigDecimal.valueOf(100))
          .divide(totalIncome, 2, RoundingMode.HALF_UP);
      }
    } catch (Exception ignored) {
      // Profile optional or missing
    }

    return FinancialOverviewResponse.builder()
      .totalIncome(totalIncome)
      .totalExpenses(totalExpenses)
      .netCashFlow(netCashFlow)
      .totalSavings(totalSavings)
      .savingsRatePercentage(savingsRate)
      .activeSubscriptionsMonthlyCost(subSummary.getTotalMonthlyCost())
      .totalGoals(goalSummary.getTotalGoals())
      .overallGoalProgressPercentage(goalSummary.getOverallProgressPercentage())
      .build();
  }

  @Override
  @Transactional(readOnly = true)
  public List<com.hackathon.financecoach.dto.response.TrendDataPoint> getIncomeExpenseTrends(Long userId) {
    // Generating recent 6-month trends from transactional records
    List<com.hackathon.financecoach.dto.response.TrendDataPoint> trends = new ArrayList<>();
    LocalDate now = LocalDate.now();

    for (int i = 5; i >= 0; i--) {
      LocalDate monthStart = now.minusMonths(i).withDayOfMonth(1);
      LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());

      TransactionSummaryResponse summary = transactionService.getTransactionSummary(userId, monthStart, monthEnd);
      BigDecimal income = summary.getTotalIncome();
      BigDecimal expense = summary.getTotalExpense();
      BigDecimal net = income.subtract(expense);

      trends.add(com.hackathon.financecoach.dto.response.TrendDataPoint.builder()
        .periodLabel(monthStart.getYear() + "-" + String.format("%02d", monthStart.getMonthValue()))
        .income(income)
        .expense(expense)
        .netFlow(net)
        .build());
    }

    return trends;
  }

  @Override
  @Transactional(readOnly = true)
  public CategorySpendingResponse getCategorySpending(Long userId, LocalDate startDate, LocalDate endDate) {
    TransactionSummaryResponse summary = transactionService.getTransactionSummary(userId, startDate, endDate);
    Map<TransactionCategory, BigDecimal> categoryTotals = summary.getCategoryExpenseTotals();

    BigDecimal totalExpense = summary.getTotalExpense();
    Map<TransactionCategory, BigDecimal> categoryPercentages = new HashMap<>();

    if (totalExpense.compareTo(BigDecimal.ZERO) > 0) {
      for (Map.Entry<TransactionCategory, BigDecimal> entry : categoryTotals.entrySet()) {
        BigDecimal percentage = entry.getValue()
          .multiply(BigDecimal.valueOf(100))
          .divide(totalExpense, 2, RoundingMode.HALF_UP);
        categoryPercentages.put(entry.getKey(), percentage);
      }
    }

    return CategorySpendingResponse.builder()
      .categoryTotals(categoryTotals)
      .categoryPercentages(categoryPercentages)
      .build();
  }

  @Override
  @Transactional(readOnly = true)
  public DashboardAnalyticsResponse getCompleteDashboard(Long userId) {
    LocalDate startOfYear = LocalDate.now().withDayOfYear(1);
    LocalDate today = LocalDate.now();

    FinancialOverviewResponse overview = getFinancialOverview(userId, startOfYear, today);

    List<com.hackathon.financecoach.dto.response.TrendDataPoint> monthlyTrends = getIncomeExpenseTrends(userId);
    CategorySpendingResponse categorySpending = getCategorySpending(userId, startOfYear, today);
    SubscriptionSummaryResponse subscriptionSummary = subscriptionService.getSubscriptionSummary(userId);
    GoalSummaryResponse goalSummary = goalService.getGoalSummary(userId);

    return DashboardAnalyticsResponse.builder()
      .overview(overview)
      .monthlyTrends(monthlyTrends)
      .categorySpending(categorySpending)
      .subscriptionSummary(subscriptionSummary)
      .goalSummary(goalSummary)
      .build();
  }
}
