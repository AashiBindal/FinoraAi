package com.hackathon.financecoach.dto;

import com.hackathon.financecoach.entity.Transaction;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TransactionDTOs {

    public record TransactionRequest(
            @NotNull(message = "Transaction type is required (INCOME or EXPENSE)")
            TransactionType type,

            @NotNull(message = "Amount is required")
            @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
            BigDecimal amount,

            @NotNull(message = "Category is required")
            TransactionCategory category,

            @NotBlank(message = "Description is required")
            String description,

            @NotNull(message = "Transaction date is required")
            LocalDate transactionDate
    ) {}

    public record TransactionResponse(
            Long id,
            TransactionType type,
            BigDecimal amount,
            TransactionCategory category,
            String description,
            LocalDate transactionDate,
            LocalDateTime createdAt
    ) {
        public static TransactionResponse fromEntity(Transaction t) {
            return new TransactionResponse(
                    t.getId(),
                    t.getType(),
                    t.getAmount(),
                    t.getCategory(),
                    t.getTitle(),
                    t.getTransactionDate(),
                    t.getCreatedAt()
            );
        }
    }
}
