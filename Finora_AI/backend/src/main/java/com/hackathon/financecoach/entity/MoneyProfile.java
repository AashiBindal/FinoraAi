package com.hackathon.financecoach.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "money_profiles", indexes = {
  @Index(name = "idx_profile_user_id", columnList = "user_id", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoneyProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false, unique = true)
  private User user;

  @NotNull(message = "Monthly income is required")
  @DecimalMin(value = "0.00", message = "Monthly income cannot be negative")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal monthlyIncome;

  @Column(length = 50)
  private String employmentStatus;

  @Column(length = 100)
  private String incomeSource;

  @NotNull(message = "Monthly fixed expenses are required")
  @DecimalMin(value = "0.00", message = "Fixed expenses cannot be negative")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal monthlyFixedExpenses;

  @NotNull(message = "Monthly variable expenses are required")
  @DecimalMin(value = "0.00", message = "Variable expenses cannot be negative")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal monthlyVariableExpenses;

  @NotNull(message = "Savings amount is required")
  @DecimalMin(value = "0.00", message = "Savings amount cannot be negative")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal savingsAmount;

  @NotNull(message = "Existing debt is required")
  @DecimalMin(value = "0.00", message = "Debt cannot be negative")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal existingDebt;

  private Integer financialDependents;

  @Column(length = 10)
  private String preferredCurrency;

  @Column(length = 50)
  private String financialExperienceLevel;

  @Column(length = 255)
  private String financialPriorities;

  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
    if (preferredCurrency == null) {
      preferredCurrency = "INR";
    }
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }
}
