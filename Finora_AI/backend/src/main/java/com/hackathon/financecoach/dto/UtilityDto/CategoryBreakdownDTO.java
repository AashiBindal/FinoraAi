package com.hackathon.financecoach.dto.UtilityDto;

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
public class CategoryBreakdownDTO {

  private TransactionCategory category;

  private BigDecimal amount;

  private double percentageOfExpenses;
}
