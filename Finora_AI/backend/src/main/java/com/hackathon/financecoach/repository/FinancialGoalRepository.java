package com.hackathon.financecoach.repository;

import com.hackathon.financecoach.entity.FinancialGoal;
import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FinancialGoalRepository extends JpaRepository<FinancialGoal, Long> {

  Optional<FinancialGoal> findByIdAndUserId(Long id, Long userId);

  @Query("SELECT g FROM FinancialGoal g WHERE g.user.id = :userId " +
    "AND (:status IS NULL OR g.status = :status) " +
    "AND (:category IS NULL OR g.category = :category)")
  Page<FinancialGoal> findFilteredGoals(
    @Param("userId") Long userId,
    @Param("status") GoalStatus status,
    @Param("category") GoalCategory category,
    Pageable pageable
  );

  List<FinancialGoal> findByUserId(Long userId);

  List<FinancialGoal> findByUserIdAndStatus(Long userId, GoalStatus status);

  @Query("SELECT g FROM FinancialGoal g WHERE g.user.id = :userId AND g.status = 'ACTIVE' " +
    "AND g.targetDate BETWEEN :startDate AND :endDate ORDER BY g.targetDate ASC")
  List<FinancialGoal> findUpcomingDeadlines(
    @Param("userId") Long userId,
    @Param("startDate") LocalDate startDate,
    @Param("endDate") LocalDate endDate
  );

  List<FinancialGoal> findByUserIdOrderByTargetDateAsc(Long userId);
}
