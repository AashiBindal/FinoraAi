package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiForecastResponse {

  private String summary;

  private int forecastMonths;

  private List<ForecastMonthDTO> monthlyForecasts;

  private BigDecimal baselineMonthlyNetSavings;

  private String aiProjectionNarrative;

  private List<String> recommendations;

  private String source;

  private String model;

  private OffsetDateTime generatedAt;

  private String dataUsed;

  private String notice;

  private String disclaimer;
}
