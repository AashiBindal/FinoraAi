package com.hackathon.financecoach.dto.Request;

import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionRequest {

  @NotBlank(message = "Title or description is required")
  @Size(max = 255, message = "Title cannot exceed 255 characters")
  private String title;

  @NotNull(message = "Amount is required")
  @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
  private BigDecimal amount;

  @NotNull(message = "Transaction type is required")
  private TransactionType type;

  @NotNull(message = "Transaction category is required")
  private TransactionCategory category;

  @NotNull(message = "Transaction date is required")
  private LocalDate transactionDate;

  private String paymentMethod;

  @Size(max = 500, message = "Notes cannot exceed 500 characters")
  private String notes;
}
