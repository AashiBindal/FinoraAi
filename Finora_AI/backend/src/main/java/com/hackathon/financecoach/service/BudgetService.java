package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.BudgetDTOs.*;
import com.hackathon.financecoach.entity.Budget;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.exception.DuplicateResourceException;
import com.hackathon.financecoach.exception.ResourceNotFoundException;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import com.hackathon.financecoach.repository.BudgetRepository;
import com.hackathon.financecoach.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BudgetService {

    private final BudgetRepository budgetRepo;
    private final TransactionRepository transactionRepo;
    private final ApplicationEventPublisher eventPublisher;

    public List<BudgetResponse> listBudgets(User user, LocalDate month) {
        if (month == null) month = LocalDate.now().withDayOfMonth(1);
        else month = month.withDayOfMonth(1);

        return budgetRepo.findByUserIdAndMonth(user.getId(), month).stream()
                .map(BudgetResponse::fromEntity)
                .toList();
    }

    @Transactional
    public BudgetResponse createBudget(User user, BudgetRequest request) {
        LocalDate normMonth = request.month().withDayOfMonth(1);

        if (budgetRepo.existsByUserIdAndMonthAndCategory(user.getId(), normMonth, request.category())) {
            throw new DuplicateResourceException(String.format("Budget already exists for %s in %s",
                    request.category() != null ? request.category().name() : "TOTAL", normMonth));
        }

        Budget budget = Budget.builder()
                .user(user)
                .month(normMonth)
                .category(request.category())
                .limitAmount(request.limitAmount())
                .build();

        Budget saved = budgetRepo.save(budget);
        eventPublisher.publishEvent(new LivingMoneyModelService.ModelRefreshEvent(user.getId()));
        return BudgetResponse.fromEntity(saved);
    }

    @Transactional
    public BudgetResponse updateBudget(User user, Long id, BudgetRequest request) {
        Budget b = budgetRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + id));

        b.setLimitAmount(request.limitAmount());
        Budget saved = budgetRepo.save(b);
        eventPublisher.publishEvent(new LivingMoneyModelService.ModelRefreshEvent(user.getId()));
        return BudgetResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteBudget(User user, Long id) {
        Budget b = budgetRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + id));

        budgetRepo.delete(b);
        eventPublisher.publishEvent(new LivingMoneyModelService.ModelRefreshEvent(user.getId()));
    }

    public BudgetStatusResponse getBudgetStatus(User user, LocalDate month) {
        if (month == null) month = LocalDate.now().withDayOfMonth(1);
        else month = month.withDayOfMonth(1);

        LocalDate start = month;
        LocalDate end = month.withDayOfMonth(month.lengthOfMonth());

        List<Budget> budgets = budgetRepo.findByUserIdAndMonth(user.getId(), start);
        var projections = transactionRepo.findCategorySpendBetween(user.getId(), start, end);
        Map<TransactionCategory, BigDecimal> catSpend = new HashMap<>();
        for (var p : projections) {
            catSpend.put(p.getCategory(), p.getTotal());
        }

        BigDecimal totalExpenses = transactionRepo.sumAmountByUserIdAndTypeAndDateBetween(
                user.getId(), TransactionType.EXPENSE, start, end
        );
        if (totalExpenses == null) totalExpenses = BigDecimal.ZERO;

        BigDecimal overallLimit = BigDecimal.ZERO;
        List<CategoryBudgetStatusDTO> categoryBudgets = new ArrayList<>();
        List<String> alerts = new ArrayList<>();

        for (Budget b : budgets) {
            if (b.getCategory() == null) {
                overallLimit = b.getLimitAmount();
            } else {
                BigDecimal spent = catSpend.getOrDefault(b.getCategory(), BigDecimal.ZERO);
                BigDecimal rem = b.getLimitAmount().subtract(spent);
                double usage = b.getLimitAmount().compareTo(BigDecimal.ZERO) > 0
                        ? spent.multiply(new BigDecimal("100")).divide(b.getLimitAmount(), 1, RoundingMode.HALF_UP).doubleValue()
                        : 0.0;

                String status = "OK";
                if (usage >= 100.0) {
                    status = "EXCEEDED";
                    alerts.add(String.format("CRITICAL: %s budget exceeded! Spent ₹%,.2f of ₹%,.2f (%.1f%%).",
                            b.getCategory().name(), spent, b.getLimitAmount(), usage));
                } else if (usage >= 80.0) {
                    status = "WARNING";
                    alerts.add(String.format("WARNING: %s budget nearing limit! Spent ₹%,.2f of ₹%,.2f (%.1f%%).",
                            b.getCategory().name(), spent, b.getLimitAmount(), usage));
                }

                categoryBudgets.add(new CategoryBudgetStatusDTO(
                        b.getId(),
                        b.getCategory(),
                        b.getLimitAmount(),
                        spent,
                        rem,
                        usage,
                        status
                ));
            }
        }

        // If no overall budget set explicitly, sum individual limits
        if (overallLimit.compareTo(BigDecimal.ZERO) == 0 && !categoryBudgets.isEmpty()) {
            overallLimit = categoryBudgets.stream()
                    .map(CategoryBudgetStatusDTO::limitAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal overallRemaining = overallLimit.subtract(totalExpenses);
        double overallUsage = overallLimit.compareTo(BigDecimal.ZERO) > 0
                ? totalExpenses.multiply(new BigDecimal("100")).divide(overallLimit, 1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        String overallStatus = "OK";
        if (overallUsage >= 100.0) {
            overallStatus = "EXCEEDED";
            alerts.add(String.format("ALERT: Total monthly budget exceeded by ₹%,.2f!", totalExpenses.subtract(overallLimit)));
        } else if (overallUsage >= 80.0) {
            overallStatus = "WARNING";
            alerts.add("WARNING: Total monthly budget utilization is above 80%.");
        }

        return new BudgetStatusResponse(
                start,
                overallLimit,
                totalExpenses,
                overallRemaining,
                overallUsage,
                overallStatus,
                categoryBudgets,
                alerts
        );
    }
}
