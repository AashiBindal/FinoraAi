package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.model.TransactionCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionSummaryResponse {
  private BigDecimal totalIncome;
  private BigDecimal totalExpense;
  private BigDecimal currentBalance;
  private Long transactionCount;
  private Map<TransactionCategory, BigDecimal> categoryExpenseTotals;
  private Map<TransactionCategory, BigDecimal> categoryIncomeTotals;
}
