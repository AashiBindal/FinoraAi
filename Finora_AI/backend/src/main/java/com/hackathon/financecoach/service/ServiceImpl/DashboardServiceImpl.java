package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.Response.*;
import com.hackathon.financecoach.service.AIService;
import com.hackathon.financecoach.service.AnalyticsService;
import com.hackathon.financecoach.service.DashboardService;
import com.hackathon.financecoach.service.GoalService;
import com.hackathon.financecoach.service.MoneyProfileService;
import com.hackathon.financecoach.service.SubscriptionService;
import com.hackathon.financecoach.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

  private final AnalyticsService analyticsService;
  private final TransactionService transactionService;
  private final SubscriptionService subscriptionService;
  private final GoalService goalService;
  private final MoneyProfileService moneyProfileService;
  private final AIService aiService;

  @Override
  @Transactional(readOnly = true)
  public DashboardResponse getDashboardData(Long userId) {
    LocalDate today = LocalDate.now();
    LocalDate startOfMonth = today.withDayOfMonth(1);

    // 1. Overview Metrics via Analytics & Modules
    FinancialOverviewResponse overview = analyticsService.getFinancialOverview(userId, startOfMonth, today);
    SubscriptionSummaryResponse subSummary = subscriptionService.getSubscriptionSummary(userId);
    GoalSummaryResponse goalSummary = goalService.getGoalSummary(userId);

    int profileCompletion = 0;
    try {
      MoneyProfileResponse profile = moneyProfileService.getProfileByUserId(userId);
      profileCompletion = profile.getProfileCompletionPercentage();
    } catch (Exception ignored) {}

    // 2. Recent Transactions (Top 5)
    List<TransactionResponse> recentTransactions = List.of();
    try {
      recentTransactions = transactionService.getFilteredTransactions(
        userId, null, null, null, null, null, null,
        PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "transactionDate"))
      ).getContent();
    } catch (Exception ignored) {}

    // 3. Upcoming Renewals
    List<SubscriptionResponse> upcomingRenewals = subSummary.getUpcomingRenewals();

    // 4. Active Goals (Top 5)
    List<GoalResponse> activeGoals = List.of();
    try {
      activeGoals = goalService.getFilteredGoals(
        userId, null, null,
        PageRequest.of(0, 5, Sort.by(Sort.Direction.ASC, "targetDate"))
      ).getContent();
    } catch (Exception ignored) {}

    // 5. AI Insights
    AIInsightResponse aiInsights = null;
    try {
      aiInsights = aiService.generateInsights(userId);
    } catch (Exception ignored) {}

    return DashboardResponse.builder()
      .totalIncome(overview.getTotalIncome())
      .totalExpenses(overview.getTotalExpenses())
      .netCashFlow(overview.getNetCashFlow())
      .totalSavings(overview.getTotalSavings())
      .savingsRatePercentage(overview.getSavingsRatePercentage())
      .activeSubscriptionsCount(subSummary.getTotalActiveSubscriptions())
      .activeSubscriptionsMonthlyCost(subSummary.getTotalMonthlyCost())
      .totalActiveGoals(goalSummary.getActiveGoals())
      .overallGoalProgressPercentage(goalSummary.getOverallProgressPercentage())
      .profileCompletionPercentage(profileCompletion)
      .recentTransactions(recentTransactions)
      .upcomingRenewals(upcomingRenewals)
      .activeGoals(activeGoals)
      .aiInsights(aiInsights)
      .build();
  }
}
