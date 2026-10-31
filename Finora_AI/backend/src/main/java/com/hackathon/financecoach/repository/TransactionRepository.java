package com.hackathon.financecoach.repository;

import com.hackathon.financecoach.entity.Transaction;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

  Optional<Transaction> findByIdAndUserId(Long id, Long userId);

  @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId " +
    "AND (:type IS NULL OR t.type = :type) " +
    "AND (:category IS NULL OR t.category = :category) " +
    "AND (:startDate IS NULL OR t.transactionDate >= :startDate) " +
    "AND (:endDate IS NULL OR t.transactionDate <= :endDate) " +
    "AND (:paymentMethod IS NULL OR t.paymentMethod = :paymentMethod) " +
    "AND (:keyword IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%')))")
  Page<Transaction> findFilteredTransactions(
    @Param("userId") Long userId,
    @Param("type") TransactionType type,
    @Param("category") TransactionCategory category,
    @Param("startDate") LocalDate startDate,
    @Param("endDate") LocalDate endDate,
    @Param("paymentMethod") String paymentMethod,
    @Param("keyword") String keyword,
    Pageable pageable
  );

  @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId " +
    "AND (:type IS NULL OR t.type = :type) " +
    "AND (:category IS NULL OR t.category = :category) " +
    "AND (:startDate IS NULL OR t.transactionDate >= :startDate) " +
    "AND (:endDate IS NULL OR t.transactionDate <= :endDate)")
  List<Transaction> findFilteredTransactionsForSummary(
    @Param("userId") Long userId,
    @Param("type") TransactionType type,
    @Param("category") TransactionCategory category,
    @Param("startDate") LocalDate startDate,
    @Param("endDate") LocalDate endDate
  );

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user.id = :userId AND t.type = 'INCOME' " +
    "AND (:startDate IS NULL OR t.transactionDate >= :startDate) AND (:endDate IS NULL OR t.transactionDate <= :endDate)")
  BigDecimal sumIncomeByUserIdAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user.id = :userId AND t.type = 'EXPENSE' " +
    "AND (:startDate IS NULL OR t.transactionDate >= :startDate) AND (:endDate IS NULL OR t.transactionDate <= :endDate)")
  BigDecimal sumExpenseByUserIdAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

  @Query("SELECT t.category, COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user.id = :userId AND t.type = :type " +
    "AND (:startDate IS NULL OR t.transactionDate >= :startDate) AND (:endDate IS NULL OR t.transactionDate <= :endDate) GROUP BY t.category")
  List<Object[]> sumByCategoryAndType(@Param("userId") Long userId, @Param("type") TransactionType type, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

  // ---- Queries used by the "living money model", budgets and the AI context builder ----

  /** Interface projection: expense total per category. */
  interface CategorySpendProjection {
    TransactionCategory getCategory();
    BigDecimal getTotal();
  }

  @Query("SELECT t.category AS category, COALESCE(SUM(t.amount), 0) AS total FROM Transaction t " +
    "WHERE t.user.id = :userId AND t.type = com.hackathon.financecoach.model.TransactionType.EXPENSE " +
    "AND t.transactionDate >= :startDate AND t.transactionDate <= :endDate " +
    "GROUP BY t.category ORDER BY SUM(t.amount) DESC")
  List<CategorySpendProjection> findCategorySpendBetween(@Param("userId") Long userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user.id = :userId AND t.type = :type " +
    "AND t.transactionDate >= :startDate AND t.transactionDate <= :endDate")
  BigDecimal sumAmountByUserIdAndTypeAndDateBetween(@Param("userId") Long userId, @Param("type") TransactionType type, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user.id = :userId AND t.type = :type")
  BigDecimal sumAllTimeAmountByUserIdAndType(@Param("userId") Long userId, @Param("type") TransactionType type);

  List<Transaction> findByUserIdOrderByTransactionDateDesc(Long userId, Pageable pageable);

  List<Transaction> findByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(Long userId, LocalDate startDate, LocalDate endDate);

  @Query("SELECT AVG(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.category = :category " +
    "AND t.type = com.hackathon.financecoach.model.TransactionType.EXPENSE")
  BigDecimal findAverageAmountByCategory(@Param("userId") Long userId, @Param("category") TransactionCategory category);
}
