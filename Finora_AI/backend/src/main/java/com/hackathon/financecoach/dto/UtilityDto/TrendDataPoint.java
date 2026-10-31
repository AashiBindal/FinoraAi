package com.hackathon.financecoach.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendDataPoint {
  private String periodLabel; // e.g., "2026-08" or "August"
  private BigDecimal income;
  private BigDecimal expense;
  private BigDecimal netFlow;
}
