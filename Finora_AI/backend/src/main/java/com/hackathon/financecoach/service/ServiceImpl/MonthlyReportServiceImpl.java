package com.hackathon.financecoach.service.report.impl;

import com.hackathon.financecoach.dto.Response.*;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.service.AIService;
import com.hackathon.financecoach.service.GoalService;
import com.hackathon.financecoach.service.MoneyProfileService;
import com.hackathon.financecoach.service.MonthlyReportService;
import com.hackathon.financecoach.service.SubscriptionService;
import com.hackathon.financecoach.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MonthlyReportServiceImpl implements MonthlyReportService {

  private final TransactionService transactionService;
  private final SubscriptionService subscriptionService;
  private final MoneyProfileService moneyProfileService;
  private final GoalService goalService;
  private final AIService aiService;

  @Override
  @Transactional(readOnly = true)
  public MonthlyReportResponse generateMonthlyReport(Long userId, int year, int month) {
    LocalDate startDate = LocalDate.of(year, month, 1);
    LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
    String monthName = startDate.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);

    // Current month summaries
    TransactionSummaryResponse currentSummary = transactionService.getTransactionSummary(userId, startDate, endDate);
    SubscriptionSummaryResponse subSummary = subscriptionService.getSubscriptionSummary(userId);
    GoalSummaryResponse goalSummary = goalService.getGoalSummary(userId);

    BigDecimal totalIncome = currentSummary.getTotalIncome();
    BigDecimal totalExpenses = currentSummary.getTotalExpense();
    BigDecimal netCashFlow = currentSummary.getCurrentBalance();

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
    } catch (Exception ignored) {}

    // Previous month comparisons
    LocalDate prevStartDate = startDate.minusMonths(1);
    LocalDate prevEndDate = prevStartDate.withDayOfMonth(prevStartDate.lengthOfMonth());
    TransactionSummaryResponse prevSummary = transactionService.getTransactionSummary(userId, prevStartDate, prevEndDate);

    BigDecimal prevIncome = prevSummary.getTotalIncome();
    BigDecimal prevExpense = prevSummary.getTotalExpense();

    BigDecimal incomeChange = calculatePercentageChange(prevIncome, totalIncome);
    BigDecimal expenseChange = calculatePercentageChange(prevExpense, totalExpenses);
    BigDecimal netFlowChange = netCashFlow.subtract(prevSummary.getCurrentBalance());

    MonthOverMonthComparison mom = MonthOverMonthComparison.builder()
      .incomeChangePercentage(incomeChange)
      .expenseChangePercentage(expenseChange)
      .savingsChangePercentage(incomeChange.subtract(expenseChange))
      .netCashFlowChange(netFlowChange)
      .build();

    // Highlights (Highest category expense)
    Map<TransactionCategory, BigDecimal> categoryExpenses = currentSummary.getCategoryExpenseTotals();
    TransactionCategory highestCategory = null;
    BigDecimal highestAmount = BigDecimal.ZERO;
    for (Map.Entry<TransactionCategory, BigDecimal> entry : categoryExpenses.entrySet()) {
      if (entry.getValue().compareTo(highestAmount) > 0) {
        highestAmount = entry.getValue();
        highestCategory = entry.getKey();
      }
    }

    MonthlyHighlightResponse highlights = MonthlyHighlightResponse.builder()
      .highestSpendingCategory(highestCategory)
      .highestCategoryAmount(highestAmount)
      .summaryMessage(highestCategory != null ?
        "Your highest expense category for " + monthName + " was " + highestCategory + " amounting to " + highestAmount + "." :
        "No significant expenses recorded for " + monthName + ".")
      .build();

    // Optional AI Insights generation
    String aiInsights = "Report generated successfully based on recorded records.";
    try {
      AIChatResponse aiResp = aiService.processChat(userId, "Summarize my financial performance for " + monthName + " " + year);
      if (aiResp != null && aiResp.getResponse() != null) {
        aiInsights = aiResp.getResponse();
      }
    } catch (Exception ignored) {}

    return MonthlyReportResponse.builder()
      .year(year)
      .month(month)
      .monthName(monthName)
      .totalIncome(totalIncome)
      .totalExpenses(totalExpenses)
      .netCashFlow(netCashFlow)
      .totalSavings(totalSavings)
      .savingsRatePercentage(savingsRate)
      .categoryExpenses(categoryExpenses)
      .incomeTransactionCount(currentSummary.getTransactionCount())
      .expenseTransactionCount(currentSummary.getTransactionCount())
      .monthlyRecurringSubscriptionsCost(subSummary.getTotalMonthlyCost())
      .activeGoalsCount(goalSummary.getActiveGoals())
      .goalProgressPercentage(goalSummary.getOverallProgressPercentage())
      .monthOverMonthComparison(mom)
      .highlights(highlights)
      .aiInsights(aiInsights)
      .build();
  }

  private BigDecimal calculatePercentageChange(BigDecimal oldVal, BigDecimal newVal) {
    if (oldVal == null || oldVal.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO;
    }
    return newVal.subtract(oldVal)
      .multiply(BigDecimal.valueOf(100))
      .divide(oldVal, 2, RoundingMode.HALF_UP);
  }
}
