package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.model.TransactionCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyHighlightResponse {
  private TransactionCategory highestSpendingCategory;
  private BigDecimal highestCategoryAmount;
  private String summaryMessage;
}
