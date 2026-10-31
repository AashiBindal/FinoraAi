package com.hackathon.financecoach.entity;

import com.hackathon.financecoach.model.BillingCycle;
import com.hackathon.financecoach.model.SubscriptionStatus;
import com.hackathon.financecoach.model.TransactionCategory;
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
@Table(name = "subscriptions", indexes = {
  @Index(name = "idx_sub_user_status", columnList = "user_id, status"),
  @Index(name = "idx_sub_user_next_billing", columnList = "user_id, next_billing_date")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @NotBlank(message = "Subscription name is required")
  @Column(nullable = false)
  private String name;

  @NotNull(message = "Amount is required")
  @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal amount;

  @NotNull(message = "Billing cycle is required")
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private BillingCycle billingCycle;

  @NotNull(message = "Category is required")
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TransactionCategory category;

  @NotNull(message = "Start date is required")
  @Column(nullable = false)
  private LocalDate startDate;

  @NotNull(message = "Next billing date is required")
  @Column(nullable = false)
  private LocalDate nextBillingDate;

  @Column(length = 50)
  private String paymentMethod;

  @NotNull(message = "Status is required")
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private SubscriptionStatus status;

  @Column(length = 500)
  private String description;

  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
    if (status == null) {
      status = SubscriptionStatus.ACTIVE;
    }
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }
}
