package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {
  private Long id;
  private String title;
  private BigDecimal amount;
  private TransactionType type;
  private TransactionCategory category;
  private LocalDate transactionDate;
  private String paymentMethod;
  private String notes;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
