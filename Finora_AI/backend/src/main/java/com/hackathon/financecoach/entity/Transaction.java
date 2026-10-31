package com.hackathon.financecoach.entity;

import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", indexes = {
  @Index(name = "idx_user_transaction_date", columnList = "user_id, transaction_date"),
  @Index(name = "idx_user_category", columnList = "user_id, category"),
  @Index(name = "idx_user_type", columnList = "user_id, type")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @NotBlank(message = "Title or description is required")
  @Column(nullable = false)
  private String title;

  @NotNull(message = "Amount is required")
  @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal amount;

  @NotNull(message = "Transaction type is required")
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TransactionType type;

  @NotNull(message = "Transaction category is required")
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TransactionCategory category;

  @NotNull(message = "Transaction date is required")
  @Column(nullable = false)
  private LocalDate transactionDate;

  @Column(length = 50)
  private String paymentMethod;

  @Column(length = 500)
  private String notes;

  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }
}
