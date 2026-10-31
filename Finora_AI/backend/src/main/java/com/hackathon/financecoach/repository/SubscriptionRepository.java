package com.hackathon.financecoach.repository;

import com.hackathon.financecoach.entity.Subscription;
import com.hackathon.financecoach.model.SubscriptionStatus;
import com.hackathon.financecoach.model.TransactionCategory;
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
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

  Optional<Subscription> findByIdAndUserId(Long id, Long userId);

  @Query("SELECT s FROM Subscription s WHERE s.user.id = :userId " +
    "AND (:status IS NULL OR s.status = :status) " +
    "AND (:category IS NULL OR s.category = :category) " +
    "AND (:keyword IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
  Page<Subscription> findFilteredSubscriptions(
    @Param("userId") Long userId,
    @Param("status") SubscriptionStatus status,
    @Param("category") TransactionCategory category,
    @Param("keyword") String keyword,
    Pageable pageable
  );

  List<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);

  @Query("SELECT s FROM Subscription s WHERE s.user.id = :userId AND s.status = 'ACTIVE' " +
    "AND s.nextBillingDate BETWEEN :startDate AND :endDate ORDER BY s.nextBillingDate ASC")
  List<Subscription> findUpcomingRenewals(
    @Param("userId") Long userId,
    @Param("startDate") LocalDate startDate,
    @Param("endDate") LocalDate endDate
  );
}
