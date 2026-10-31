package com.hackathon.financecoach.dto.Request;

import com.hackathon.financecoach.model.BillingCycle;
import com.hackathon.financecoach.model.SubscriptionStatus;
import com.hackathon.financecoach.model.TransactionCategory;
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
public class SubscriptionRequest {

  @NotBlank(message = "Subscription name is required")
  @Size(max = 255, message = "Name cannot exceed 255 characters")
  private String name;

  @NotNull(message = "Amount is required")
  @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
  private BigDecimal amount;

  @NotNull(message = "Billing cycle is required")
  private BillingCycle billingCycle;

  @NotNull(message = "Category is required")
  private TransactionCategory category;

  @NotNull(message = "Start date is required")
  private LocalDate startDate;

  @NotNull(message = "Next billing date is required")
  private LocalDate nextBillingDate;

  private String paymentMethod;

  @NotNull(message = "Status is required")
  private SubscriptionStatus status;

  @Size(max = 500, message = "Description cannot exceed 500 characters")
  private String description;
}
