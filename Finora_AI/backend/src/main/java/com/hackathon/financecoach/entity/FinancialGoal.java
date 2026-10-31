package com.hackathon.financecoach.entity;

import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
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
@Table(name = "financial_goals", indexes = {
  @Index(name = "idx_goal_user_status", columnList = "user_id, status"),
  @Index(name = "idx_goal_user_deadline", columnList = "user_id, target_date")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialGoal {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @NotBlank(message = "Goal title is required")
  @Column(nullable = false)
  private String title;

  @Column(length = 500)
  private String description;

  @NotNull(message = "Target amount is required")
  @DecimalMin(value = "0.01", message = "Target amount must be greater than zero")
  @Column(nullable = false, precision = 15, scale = 2)
  private BigDecimal targetAmount;

  @NotNull(message = "Current saved amount is required")
  @DecimalMin(value = "0.00", message = "Saved amount cannot be negative")
  @Column(nullable = false, precision = 15, scale = 2)
  @Builder.Default
  private BigDecimal currentAmount = BigDecimal.ZERO;

  @NotNull(message = "Goal category is required")
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private GoalCategory category;

  @NotNull(message = "Target deadline date is required")
  @Column(nullable = false)
  private LocalDate targetDate;

  @Column(length = 20)
  private String priority; // HIGH, MEDIUM, LOW

  @NotNull(message = "Goal status is required")
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private GoalStatus status = GoalStatus.ACTIVE;

  @DecimalMin(value = "0.00", message = "Monthly contribution target cannot be negative")
  @Column(precision = 15, scale = 2)
  private BigDecimal monthlyContributionTarget;

  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
    if (status == null) {
      status = GoalStatus.ACTIVE;
    }
    if (currentAmount == null) {
      currentAmount = BigDecimal.ZERO;
    }
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }
}
