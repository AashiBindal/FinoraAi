package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Request.TransactionRequest;
import com.hackathon.financecoach.dto.Response.TransactionResponse;
import com.hackathon.financecoach.dto.Response.TransactionSummaryResponse;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface TransactionService {
  TransactionResponse createTransaction(Long userId, TransactionRequest request);

  Page<TransactionResponse> getFilteredTransactions(
    Long userId,
    TransactionType type,
    TransactionCategory category,
    LocalDate startDate,
    LocalDate endDate,
    String paymentMethod,
    String keyword,
    Pageable pageable
  );

  TransactionResponse getTransactionById(Long userId, Long transactionId);

  TransactionResponse updateTransaction(Long userId, Long transactionId, TransactionRequest request);

  void deleteTransaction(Long userId, Long transactionId);

  TransactionSummaryResponse getTransactionSummary(Long userId, LocalDate startDate, LocalDate endDate);
}
