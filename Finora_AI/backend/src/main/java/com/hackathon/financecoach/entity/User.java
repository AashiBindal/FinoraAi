package com.hackathon.financecoach.entity;

import com.hackathon.financecoach.model.RiskPreference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fc_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal monthlyIncomeTarget = new BigDecimal("85000.00");

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal savingsGoalPercent = new BigDecimal("25.00");

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private RiskPreference riskPreference = RiskPreference.MEDIUM;

    @Column(length = 500)
    private String financialGoalsText;

    @Column(nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

  // Bridge used by the settings API: exposes savingsGoalPercent as a Double.
  // Not a separate column (no field), so @Transient is not needed.
  public void setSavingsGoalPercentage(Double savingsGoalPercentage) {
    this.savingsGoalPercent = savingsGoalPercentage == null ? null : BigDecimal.valueOf(savingsGoalPercentage);
  }

  public Double getSavingsGoalPercentage() {
    return savingsGoalPercent == null ? null : savingsGoalPercent.doubleValue();
  }
}
