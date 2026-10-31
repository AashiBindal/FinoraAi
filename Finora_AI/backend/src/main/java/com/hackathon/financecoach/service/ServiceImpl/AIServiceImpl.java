package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.config.AIConfig;
import com.hackathon.financecoach.dto.Response.*;
import com.hackathon.financecoach.service.AIService;
import com.hackathon.financecoach.service.GoalService;
import com.hackathon.financecoach.service.MoneyProfileService;
import com.hackathon.financecoach.service.SubscriptionService;
import com.hackathon.financecoach.service.TransactionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIServiceImpl implements AIService {

  private final AIConfig aiConfig;
  private final ChatClient financeChatClient;

  private final MoneyProfileService moneyProfileService;
  private final TransactionService transactionService;
  private final SubscriptionService subscriptionService;
  private final GoalService goalService;

  @Override
  public AIChatResponse processChat(Long userId, String userMessage) {

    if (!isAIAvailable()) {
      return AIChatResponse.builder()
        .response("AI Finance Coach is currently disabled or API key is unconfigured.")
        .model(aiConfig.getModel())
        .build();
    }

    String financialContext = buildFinancialContext(userId);

    String systemPrompt =
      "You are a responsible personal finance assistant. " +
        "Use only the provided financial data. " +
        "Never invent income, expenses, transactions, or goals. " +
        "If information is unavailable, clearly mention it. " +
        "Keep responses concise and actionable. " +
        "Do not claim to execute financial transactions or investments.\n\n" +
        "[Financial Context]:\n" + financialContext;

    String aiReply = callAI(systemPrompt, userMessage);

    return AIChatResponse.builder()
      .response(aiReply)
      .model(aiConfig.getModel())
      .build();
  }

  @Override
  public AIInsightResponse generateInsights(Long userId) {

    List<String> insights = new ArrayList<>();
    List<String> recommendations = new ArrayList<>();

    if (!isAIAvailable()) {
      return buildFallbackInsights(insights, recommendations);
    }

    String financialContext = buildFinancialContext(userId);

    String systemPrompt =
      "You are a responsible personal finance assistant. " +
        "Based strictly on the user's financial data, generate exactly " +
        "3 specific financial insights and 3 practical recommendations. " +
        "Do not invent financial information. " +
        "Clearly separate insights and recommendations using these headings:\n" +
        "INSIGHTS:\n" +
        "1. ...\n2. ...\n3. ...\n" +
        "RECOMMENDATIONS:\n" +
        "1. ...\n2. ...\n3. ...\n\n" +
        "[Financial Context]:\n" + financialContext;

    String response = callAI(
      systemPrompt,
      "Provide my insights and recommendations based on my financial data."
    );

    if (response == null || response.isBlank()
      || response.startsWith("I am currently unable")) {
      return buildFallbackInsights(insights, recommendations);
    }

    // Preserve the existing response DTO structure.
    insights.add(response);

    return AIInsightResponse.builder()
      .insights(insights)
      .recommendations(recommendations)
      .build();
  }

  private boolean isAIAvailable() {
    return aiConfig.isEnabled()
      && aiConfig.getApiKey() != null
      && !aiConfig.getApiKey().isBlank();
  }

  private AIInsightResponse buildFallbackInsights(
    List<String> insights,
    List<String> recommendations) {

    insights.add(
      "Review your spending breakdown based on recorded transactions."
    );

    recommendations.add(
      "Review your active subscriptions and recurring bills against your savings goals."
    );

    return AIInsightResponse.builder()
      .insights(insights)
      .recommendations(recommendations)
      .build();
  }

  private String callAI(String systemPrompt, String userMessage) {

    try {
      String response = financeChatClient.prompt()
        .system(systemPrompt)
        .user(userMessage)
        .call()
        .content();

      if (response == null || response.isBlank()) {
        log.warn("Spring AI returned an empty response.");
        return getFallbackMessage();
      }

      return response.trim();

    } catch (Exception e) {
      log.error("Spring AI communication failed: {}", e.getMessage(), e);
      return getFallbackMessage();
    }
  }

  private String getFallbackMessage() {
    return "I am currently unable to connect to the AI service. " +
      "Please check your financial summaries directly.";
  }

  private String buildFinancialContext(Long userId) {

    StringBuilder sb = new StringBuilder();

    try {
      MoneyProfileResponse profile =
        moneyProfileService.getProfileByUserId(userId);

      if (profile != null) {
        sb.append("- Monthly Income: ")
          .append(profile.getMonthlyIncome()).append("\n");

        sb.append("- Fixed Expenses: ")
          .append(profile.getMonthlyFixedExpenses()).append("\n");

        sb.append("- Variable Expenses: ")
          .append(profile.getMonthlyVariableExpenses()).append("\n");

        sb.append("- Savings: ")
          .append(profile.getSavingsAmount()).append("\n");

        sb.append("- Debt: ")
          .append(profile.getExistingDebt()).append("\n");
      }

    } catch (Exception e) {
      log.warn("Unable to load money profile for user {}: {}", userId, e.getMessage());
      sb.append("- Money Profile: Not completed or unavailable.\n");
    }

    try {
      LocalDate endDate = LocalDate.now();
      LocalDate startDate = endDate.minusDays(30);

      TransactionSummaryResponse txSummary =
        transactionService.getTransactionSummary(userId, startDate, endDate);

      if (txSummary != null) {
        sb.append("- Last 30 Days Income: ")
          .append(txSummary.getTotalIncome()).append("\n");

        sb.append("- Last 30 Days Expenses: ")
          .append(txSummary.getTotalExpense()).append("\n");
      }

    } catch (Exception e) {
      log.warn("Unable to load transaction summary for user {}: {}", userId, e.getMessage());
      sb.append("- Transactions: Summary unavailable.\n");
    }

    try {
      SubscriptionSummaryResponse subSummary =
        subscriptionService.getSubscriptionSummary(userId);

      if (subSummary != null) {
        sb.append("- Active Subscriptions Count: ")
          .append(subSummary.getTotalActiveSubscriptions()).append("\n");

        sb.append("- Total Monthly Subscriptions Cost: ")
          .append(subSummary.getTotalMonthlyCost()).append("\n");
      }

    } catch (Exception e) {
      log.warn("Unable to load subscriptions for user {}: {}", userId, e.getMessage());
      sb.append("- Subscriptions: Summary unavailable.\n");
    }

    try {
      GoalSummaryResponse goalSummary =
        goalService.getGoalSummary(userId);

      if (goalSummary != null) {
        sb.append("- Total Goals: ")
          .append(goalSummary.getTotalGoals()).append("\n");

        sb.append("- Active Goals: ")
          .append(goalSummary.getActiveGoals()).append("\n");

        sb.append("- Total Goal Saved Amount: ")
          .append(goalSummary.getTotalSavedAmount()).append("\n");
      }

    } catch (Exception e) {
      log.warn("Unable to load goals for user {}: {}", userId, e.getMessage());
      sb.append("- Goals: Summary unavailable.\n");
    }

    if (sb.isEmpty()) {
      return "No financial information is currently available.";
    }

    return sb.toString();
  }
}
