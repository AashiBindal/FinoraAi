package com.hackathon.financecoach;

import com.hackathon.financecoach.ai.FallbackRuleBasedCoach;
import com.hackathon.financecoach.dto.AiDTOs.ChatResponse;
import com.hackathon.financecoach.dto.AiDTOs.AiInsightResponse;
import com.hackathon.financecoach.dto.LivingMoneyModelDTOs.*;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.TransactionCategory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class LivingMoneyModelServiceTest {

    private FallbackRuleBasedCoach fallbackCoach;
    private User testUser;
    private LivingMoneyModel sampleModel;

    @BeforeEach
    void setUp() {
        fallbackCoach = new FallbackRuleBasedCoach();

        testUser = User.builder()
                .id(1L)
                .fullName("Rohan Sharma")
                .email("demo@finance.com")
                .currency("INR")
                .monthlyIncomeTarget(new BigDecimal("85000.00"))
                .build();

        sampleModel = LivingMoneyModel.builder()
                .currency("INR")
                .generatedAt(OffsetDateTime.now())
                .totalIncome(new BigDecimal("85000.00"))
                .totalExpenses(new BigDecimal("50000.00"))
                .netSavings(new BigDecimal("35000.00"))
                .savingsRate(41.2)
                .availableBalance(new BigDecimal("180000.00"))
                .runwayMonths(3.6)
                .categoryBreakdown(List.of(
                        new CategoryBreakdownDTO(TransactionCategory.RENT, new BigDecimal("22000.00"), 44.0, 0.0, "#6366f1"),
                        new CategoryBreakdownDTO(TransactionCategory.FOOD, new BigDecimal("15500.00"), 31.0, 25.0, "#ec4899")
                ))
                .top3Categories(List.of(TransactionCategory.RENT, TransactionCategory.FOOD))
                .healthScore(HealthScoreDTO.builder()
                        .score(86)
                        .label("Excellent")
                        .summary("Outstanding financial vitals")
                        .build())
                .build();
    }

    @Test
    @DisplayName("Verify deterministic savings rate computation")
    void testSavingsRateComputation() {
        BigDecimal income = new BigDecimal("85000.00");
        BigDecimal expenses = new BigDecimal("50000.00");
        BigDecimal savings = income.subtract(expenses);
        double rate = savings.multiply(new BigDecimal("100")).divide(income, 1, java.math.RoundingMode.HALF_UP).doubleValue();

        assertEquals(new BigDecimal("35000.00"), savings);
        assertEquals(41.2, rate, 0.1);
    }

    @Test
    @DisplayName("Verify Fallback Rule-Based Coach chat response grounding")
    void testFallbackChatResponse() {
        ChatResponse response = fallbackCoach.generateChatFallback("Can I afford a ₹20,000 phone?", testUser, sampleModel);

        assertNotNull(response);
        assertEquals("FALLBACK_RULE_BASED", response.getSource());
        assertNull(response.getModel());
        assertTrue(response.getReply().contains("₹85,000.00"));
        assertTrue(response.getReply().contains("₹50,000.00"));
        assertTrue(response.getReply().contains("₹35,000.00"));
        assertNotNull(response.getNotice());
    }

    @Test
    @DisplayName("Verify Fallback Rule-Based Coach insights generation")
    void testFallbackInsightsResponse() {
        AiInsightResponse insights = fallbackCoach.generateInsightsFallback(testUser, sampleModel);

        assertNotNull(insights);
        assertEquals("FALLBACK_RULE_BASED", insights.getSource());
        assertEquals("RENT", insights.getTopOutflowCategory());
        assertEquals(new BigDecimal("22000.00"), insights.getTopOutflowAmount());
        assertEquals(41.2, insights.getSavingsRate(), 0.1);
        assertFalse(insights.getKeyFindings().isEmpty());
    }
}
