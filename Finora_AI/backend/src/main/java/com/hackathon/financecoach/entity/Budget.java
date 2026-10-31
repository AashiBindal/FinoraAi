package com.hackathon.financecoach.entity;

import com.hackathon.financecoach.model.TransactionCategory;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fc_budgets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_month_category", columnNames = {"user_id", "month", "category"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private LocalDate month; // Normalized to first day of month (YYYY-MM-01)

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private TransactionCategory category; // null represents "TOTAL" overall monthly budget

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal limitAmount;

    @Column(nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
