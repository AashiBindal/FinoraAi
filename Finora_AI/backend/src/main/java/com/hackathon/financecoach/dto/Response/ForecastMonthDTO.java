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
public class ForecastMonthDTO {

  private String month;

  private BigDecimal income;

  private BigDecimal expenses;

  private BigDecimal netSavings;

  private BigDecimal cumulativeSavings;
}
