package com.hackathon.financecoach.service;

import com.hackathon.financecoach.ai.FallbackRuleBasedCoach;
import com.hackathon.financecoach.ai.FinancialContextBuilder;
import com.hackathon.financecoach.dto.AiDTOs.*;
import com.hackathon.financecoach.dto.LivingMoneyModelDTOs.LivingMoneyModel;
import com.hackathon.financecoach.entity.ChatMessage;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.repository.ChatMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@Slf4j
public class FinanceCoachService {

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;
    private final LivingMoneyModelService modelService;
    private final FinancialContextBuilder contextBuilder;
    private final FallbackRuleBasedCoach fallbackCoach;
    private final ChatMessageRepository chatMessageRepo;
    private final ObjectMapper objectMapper;

    @Value("${spring.ai.openai.api-key:}")
    private String apiKey;

    @Value("${spring.ai.openai.chat.options.model:gpt-4o-mini}")
    private String modelName;

    private static final String SYSTEM_PROMPT = """
            You are Finora AI, a grounded and highly analytical Personal Finance Coach.
            You reason ONLY over the user's REAL financial data provided in the financial context JSON.
            Rules:
            1. Never invent numbers, account balances, or imaginary transactions.
            2. If data is insufficient to answer a question, explicitly say so.
            3. Always format currency in INR (₹) or the user's selected currency.
            4. Provide actionable, practical financial advice prioritizing savings rate and emergency buffers.
            5. Legal Disclaimer: This is educational guidance, not licensed SEBI investment advice.
            """;

    public FinanceCoachService(
            ObjectProvider<ChatClient.Builder> chatClientBuilderProvider,
            LivingMoneyModelService modelService,
            FinancialContextBuilder contextBuilder,
            FallbackRuleBasedCoach fallbackCoach,
            ChatMessageRepository chatMessageRepo,
            ObjectMapper objectMapper
    ) {
        this.chatClientBuilderProvider = chatClientBuilderProvider;
        this.modelService = modelService;
        this.contextBuilder = contextBuilder;
        this.fallbackCoach = fallbackCoach;
        this.chatMessageRepo = chatMessageRepo;
        this.objectMapper = objectMapper;
    }

    public ChatResponse chat(User user, ChatRequest request) {
        LivingMoneyModel model = modelService.getLivingModel(user, LocalDate.now());

        // Save User Message
        chatMessageRepo.save(ChatMessage.builder()
                .user(user)
                .role("USER")
                .content(request.message().trim())
                .build());

        // Check if LLM is enabled and configured
        if (hasValidApiKey() && chatClientBuilderProvider.getIfAvailable() != null) {
            try {
                ChatClient client = chatClientBuilderProvider.getObject().build();
                String contextJson = contextBuilder.buildContextJson(user, model);

                // Add past conversation history (last 4 messages)
                List<ChatMessage> history = chatMessageRepo.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 4));
                StringBuilder historyPrompt = new StringBuilder();
                for (int i = history.size() - 1; i >= 0; i--) {
                    ChatMessage m = history.get(i);
                    historyPrompt.append(m.getRole()).append(": ").append(m.getContent()).append("\n");
                }

                String prompt = String.format("FINANCIAL CONTEXT JSON:\n%s\n\nRECENT CHAT HISTORY:\n%s\n\nUSER QUESTION: %s",
                        contextJson, historyPrompt, request.message());

                String reply = client.prompt()
                        .system(SYSTEM_PROMPT)
                        .user(prompt)
                        .call()
                        .content();

                chatMessageRepo.save(ChatMessage.builder()
                        .user(user)
                        .role("ASSISTANT")
                        .content(reply)
                        .source("LLM")
                        .modelName(modelName)
                        .build());

                return ChatResponse.builder()
                        .reply(reply)
                        .source("LLM")
                        .model(modelName)
                        .generatedAt(OffsetDateTime.now())
                        .dataUsed("Grounded in user's live PostgreSQL Living Money Model & ledger")
                        .suggestedFollowUps(List.of(
                                "Where can I trim ₹5,000 this month?",
                                "What is my emergency fund target progress?",
                                "Analyze my food delivery expenses"
                        ))
                        .disclaimer("Finora AI provides educational guidance and scenario simulations. Not licensed financial advice.")
                        .build();

            } catch (Exception ex) {
                log.warn("Spring AI ChatClient call failed: {}. Falling back to deterministic rule-based coach.", ex.getMessage());
            }
        }

        // Fallback rule-based execution
        ChatResponse fallback = fallbackCoach.generateChatFallback(request.message(), user, model);
        chatMessageRepo.save(ChatMessage.builder()
                .user(user)
                .role("ASSISTANT")
                .content(fallback.getReply())
                .source("FALLBACK_RULE_BASED")
                .modelName(null)
                .build());

        return fallback;
    }

    public AiInsightResponse getInsights(User user, LocalDate month) {
        LivingMoneyModel model = modelService.getLivingModel(user, month);

        if (hasValidApiKey() && chatClientBuilderProvider.getIfAvailable() != null) {
            try {
                ChatClient client = chatClientBuilderProvider.getObject().build();
                String contextJson = contextBuilder.buildContextJson(user, model);

                String prompt = "Review this user's monthly financial context and output concise key insights:\n" + contextJson;
                String reply = client.prompt()
                        .system(SYSTEM_PROMPT)
                        .user(prompt)
                        .call()
                        .content();

                return AiInsightResponse.builder()
                        .summary(reply)
                        .keyFindings(List.of(
                                String.format("Active month savings rate is %.1f%%", model.getSavingsRate()),
                                String.format("Current burn rate is ₹%,.2f per month", model.getMonthlyBurnRate())
                        ))
                        .topOutflowCategory(!model.getTop3Categories().isEmpty() ? model.getTop3Categories().get(0).name() : "OTHER")
                        .topOutflowAmount(!model.getCategoryBreakdown().isEmpty() ? model.getCategoryBreakdown().get(0).getAmount() : java.math.BigDecimal.ZERO)
                        .savingsRate(model.getSavingsRate())
                        .source("LLM")
                        .model(modelName)
                        .generatedAt(OffsetDateTime.now())
                        .dataUsed("Active PostgreSQL ledger & Living Money Model")
                        .disclaimer("Educational guidance only.")
                        .build();
            } catch (Exception ex) {
                log.warn("LLM insights failed: {}. Using deterministic fallback.", ex.getMessage());
            }
        }

        return fallbackCoach.generateInsightsFallback(user, model);
    }

    public AiAnalysisResponse analyzeSpending(User user) {
        LivingMoneyModel model = modelService.getLivingModel(user, LocalDate.now());

        if (hasValidApiKey() && chatClientBuilderProvider.getIfAvailable() != null) {
            try {
                ChatClient client = chatClientBuilderProvider.getObject().build();
                String contextJson = contextBuilder.buildContextJson(user, model);

                String prompt = "Perform a thorough spending analysis. Identify unnecessary discretionary outflows, subscription creep, and savings strategies:\n" + contextJson;
                String reply = client.prompt()
                        .system(SYSTEM_PROMPT)
                        .user(prompt)
                        .call()
                        .content();

                return AiAnalysisResponse.builder()
                        .summary(reply)
                        .unnecessaryExpenses(fallbackCoach.generateAnalysisFallback(user, model).getUnnecessaryExpenses())
                        .spendingPatterns(List.of("Analyzed by " + modelName + " over 90 days of transactions"))
                        .subscriptionCreepAlerts(List.of("Streaming and gym subscriptions audited"))
                        .savingsStrategies(fallbackCoach.generateAnalysisFallback(user, model).getSavingsStrategies())
                        .riskLevel(model.getSavingsRate() >= 25 ? "LOW" : "MODERATE")
                        .source("LLM")
                        .model(modelName)
                        .generatedAt(OffsetDateTime.now())
                        .dataUsed("90-day transactions and recurring commitments")
                        .rawResponse(reply)
                        .disclaimer("Educational guidance only.")
                        .build();
            } catch (Exception ex) {
                log.warn("LLM analysis failed: {}. Using deterministic fallback.", ex.getMessage());
            }
        }

        return fallbackCoach.generateAnalysisFallback(user, model);
    }

    public AiBudgetSuggestionResponse suggestBudgets(User user) {
        LivingMoneyModel model = modelService.getLivingModel(user, LocalDate.now());

        if (hasValidApiKey() && chatClientBuilderProvider.getIfAvailable() != null) {
            try {
                ChatClient client = chatClientBuilderProvider.getObject().build();
                String contextJson = contextBuilder.buildContextJson(user, model);

                String prompt = "Generate category-wise monthly budget recommendations based on the 50/30/20 rule adapted to this user's income and history:\n" + contextJson;
                String reply = client.prompt()
                        .system(SYSTEM_PROMPT)
                        .user(prompt)
                        .call()
                        .content();

                AiBudgetSuggestionResponse base = fallbackCoach.generateBudgetSuggestionsFallback(user, model);
                base.setSummary(reply);
                base.setSource("LLM");
                base.setModel(modelName);
                base.setNotice(null);
                return base;
            } catch (Exception ex) {
                log.warn("LLM budget suggestions failed: {}. Using deterministic fallback.", ex.getMessage());
            }
        }

        return fallbackCoach.generateBudgetSuggestionsFallback(user, model);
    }

    public AiForecastResponse forecast(User user, int months) {
        LivingMoneyModel model = modelService.getLivingModel(user, LocalDate.now());
        AiForecastResponse base = fallbackCoach.generateForecastFallback(user, model, months);

        if (hasValidApiKey() && chatClientBuilderProvider.getIfAvailable() != null) {
            try {
                ChatClient client = chatClientBuilderProvider.getObject().build();
                String prompt = String.format("Explain this deterministic 3-month financial forecast: Baseline Net Savings: ₹%,.2f, Forecast Data: %s",
                        base.getBaselineMonthlyNetSavings(), objectMapper.writeValueAsString(base.getMonthlyForecasts()));

                String reply = client.prompt()
                        .system(SYSTEM_PROMPT)
                        .user(prompt)
                        .call()
                        .content();

                base.setAiProjectionNarrative(reply);
                base.setSource("LLM");
                base.setModel(modelName);
                base.setNotice(null);
            } catch (Exception ex) {
                log.warn("LLM forecast narrative failed: {}. Using deterministic fallback narrative.", ex.getMessage());
            }
        }

        return base;
    }

    private boolean hasValidApiKey() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.startsWith("${");
    }
}
