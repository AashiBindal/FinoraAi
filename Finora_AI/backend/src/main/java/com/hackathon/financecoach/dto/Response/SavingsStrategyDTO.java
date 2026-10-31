package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavingsStrategyDTO {

  private String strategyName;
  private BigDecimal potentialSavings;
  private String recommendation;
}
