package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalysisResponse {

  private String summary;

  private List<UnnecessaryExpenseDTO> unnecessaryExpenses;

  private List<String> spendingPatterns;

  private List<String> subscriptionCreepAlerts;

  private List<SavingsStrategyDTO> savingsStrategies;

  private String riskLevel;

  private String source;

  private String model;

  private OffsetDateTime generatedAt;

  private String dataUsed;

  private String notice;

  private String rawResponse;

  private String disclaimer;
}
