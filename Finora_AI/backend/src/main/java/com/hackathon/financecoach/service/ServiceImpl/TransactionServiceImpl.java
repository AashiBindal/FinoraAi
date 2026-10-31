package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.Request.TransactionRequest;
import com.hackathon.financecoach.dto.Response.TransactionResponse;
import com.hackathon.financecoach.dto.Response.TransactionSummaryResponse;
import com.hackathon.financecoach.entity.Transaction;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import com.hackathon.financecoach.repository.TransactionRepository;
import com.hackathon.financecoach.repository.UserRepository;
import com.hackathon.financecoach.service.TransactionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

  private final TransactionRepository transactionRepository;
  private final UserRepository userRepository;

  @Override
  @Transactional
  public TransactionResponse createTransaction(Long userId, TransactionRequest request) {
    User user = userRepository.findById(userId)
      .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

    Transaction transaction = Transaction.builder()
      .user(user)
      .title(request.getTitle())
      .amount(request.getAmount())
      .type(request.getType())
      .category(request.getCategory())
      .transactionDate(request.getTransactionDate())
      .paymentMethod(request.getPaymentMethod())
      .notes(request.getNotes())
      .build();

    Transaction savedTransaction = transactionRepository.save(transaction);
    return mapToResponse(savedTransaction);
  }

  @Override
  @Transactional(readOnly = true)
  public Page<TransactionResponse> getFilteredTransactions(
    Long userId,
    TransactionType type,
    TransactionCategory category,
    LocalDate startDate,
    LocalDate endDate,
    String paymentMethod,
    String keyword,
    Pageable pageable
  ) {
    Page<Transaction> transactionPage = transactionRepository.findFilteredTransactions(
      userId, type, category, startDate, endDate, paymentMethod, keyword, pageable
    );
    return transactionPage.map(this::mapToResponse);
  }

  @Override
  @Transactional(readOnly = true)
  public TransactionResponse getTransactionById(Long userId, Long transactionId) {
    Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Transaction not found or unauthorized access"));
    return mapToResponse(transaction);
  }

  @Override
  @Transactional
  public TransactionResponse updateTransaction(Long userId, Long transactionId, TransactionRequest request) {
    Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Transaction not found or unauthorized access"));

    transaction.setTitle(request.getTitle());
    transaction.setAmount(request.getAmount());
    transaction.setType(request.getType());
    transaction.setCategory(request.getCategory());
    transaction.setTransactionDate(request.getTransactionDate());
    transaction.setPaymentMethod(request.getPaymentMethod());
    transaction.setNotes(request.getNotes());

    Transaction updatedTransaction = transactionRepository.save(transaction);
    return mapToResponse(updatedTransaction);
  }

  @Override
  @Transactional
  public void deleteTransaction(Long userId, Long transactionId) {
    Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Transaction not found or unauthorized access"));
    transactionRepository.delete(transaction);
  }

  @Override
  @Transactional(readOnly = true)
  public TransactionSummaryResponse getTransactionSummary(Long userId, LocalDate startDate, LocalDate endDate) {
    BigDecimal totalIncome = transactionRepository.sumIncomeByUserIdAndDateRange(userId, startDate, endDate);
    BigDecimal totalExpense = transactionRepository.sumExpenseByUserIdAndDateRange(userId, startDate, endDate);
    BigDecimal currentBalance = totalIncome.subtract(totalExpense);

    List<Transaction> transactions = transactionRepository.findFilteredTransactionsForSummary(userId, null, null, startDate, endDate);
    long transactionCount = transactions.size();

    Map<TransactionCategory, BigDecimal> categoryExpenseTotals = new HashMap<>();
    List<Object[]> expenseRows = transactionRepository.sumByCategoryAndType(userId, TransactionType.EXPENSE, startDate, endDate);
    for (Object[] row : expenseRows) {
      categoryExpenseTotals.put((TransactionCategory) row[0], (BigDecimal) row[1]);
    }

    Map<TransactionCategory, BigDecimal> categoryIncomeTotals = new HashMap<>();
    List<Object[]> incomeRows = transactionRepository.sumByCategoryAndType(userId, TransactionType.INCOME, startDate, endDate);
    for (Object[] row : incomeRows) {
      categoryIncomeTotals.put((TransactionCategory) row[0], (BigDecimal) row[1]);
    }

    return TransactionSummaryResponse.builder()
      .totalIncome(totalIncome)
      .totalExpense(totalExpense)
      .currentBalance(currentBalance)
      .transactionCount(transactionCount)
      .categoryExpenseTotals(categoryExpenseTotals)
      .categoryIncomeTotals(categoryIncomeTotals)
      .build();
  }

  private TransactionResponse mapToResponse(Transaction transaction) {
    return TransactionResponse.builder()
      .id(transaction.getId())
      .title(transaction.getTitle())
      .amount(transaction.getAmount())
      .type(transaction.getType())
      .category(transaction.getCategory())
      .transactionDate(transaction.getTransactionDate())
      .paymentMethod(transaction.getPaymentMethod())
      .notes(transaction.getNotes())
      .createdAt(transaction.getCreatedAt())
      .updatedAt(transaction.getUpdatedAt())
      .build();
  }
}
