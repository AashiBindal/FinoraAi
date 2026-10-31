package com.hackathon.financecoach.dto.Response;

import com.hackathon.financecoach.model.BillingCycle;
import com.hackathon.financecoach.model.SubscriptionStatus;
import com.hackathon.financecoach.model.TransactionCategory;
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
public class SubscriptionResponse {
  private Long id;
  private String name;
  private BigDecimal amount;
  private BillingCycle billingCycle;
  private TransactionCategory category;
  private LocalDate startDate;
  private LocalDate nextBillingDate;
  private String paymentMethod;
  private SubscriptionStatus status;
  private String description;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
