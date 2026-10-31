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
public class BudgetUtilizationDTO {

  private String status;

  private TransactionCategory category;

  private BigDecimal spentAmount;

  private BigDecimal limitAmount;

  private double usagePercentage;
}
