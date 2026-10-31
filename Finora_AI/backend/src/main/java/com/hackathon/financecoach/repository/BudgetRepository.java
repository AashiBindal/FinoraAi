package com.hackathon.financecoach.repository;

import com.hackathon.financecoach.entity.Budget;
import com.hackathon.financecoach.model.TransactionCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    Optional<Budget> findByIdAndUserId(Long id, Long userId);

    void deleteByIdAndUserId(Long id, Long userId);

    List<Budget> findByUserIdAndMonth(Long userId, LocalDate month);

    Optional<Budget> findByUserIdAndMonthAndCategory(Long userId, LocalDate month, TransactionCategory category);

    boolean existsByUserIdAndMonthAndCategory(Long userId, LocalDate month, TransactionCategory category);
}
