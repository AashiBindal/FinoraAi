package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Request.TransactionRequest;
import com.hackathon.financecoach.dto.Response.TransactionResponse;
import com.hackathon.financecoach.dto.Response.TransactionSummaryResponse;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

  private final TransactionService transactionService;

  @PostMapping
  public ResponseEntity<TransactionResponse> createTransaction(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @Valid @RequestBody TransactionRequest request) {
    TransactionResponse response = transactionService.createTransaction(currentUser.getId(), request);
    return new ResponseEntity<>(response, HttpStatus.CREATED);
  }

  @GetMapping
  public ResponseEntity<Page<TransactionResponse>> getTransactions(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @RequestParam(required = false) TransactionType type,
    @RequestParam(required = false) TransactionCategory category,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
    @RequestParam(required = false) String paymentMethod,
    @RequestParam(required = false) String keyword,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(defaultValue = "transactionDate") String sortBy,
    @RequestParam(defaultValue = "DESC") String direction) {

    Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
    Pageable pageable = PageRequest.of(page, size, sort);

    Page<TransactionResponse> response = transactionService.getFilteredTransactions(
      currentUser.getId(), type, category, startDate, endDate, paymentMethod, keyword, pageable
    );
    return ResponseEntity.ok(response);
  }

  @GetMapping("/{id}")
  public ResponseEntity<TransactionResponse> getTransactionById(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id) {
    TransactionResponse response = transactionService.getTransactionById(currentUser.getId(), id);
    return ResponseEntity.ok(response);
  }

  @PutMapping("/{id}")
  public ResponseEntity<TransactionResponse> updateTransaction(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id,
    @Valid @RequestBody TransactionRequest request) {
    TransactionResponse response = transactionService.updateTransaction(currentUser.getId(), id, request);
    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteTransaction(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id) {
    transactionService.deleteTransaction(currentUser.getId(), id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/summary")
  public ResponseEntity<TransactionSummaryResponse> getTransactionSummary(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    TransactionSummaryResponse response = transactionService.getTransactionSummary(currentUser.getId(), startDate, endDate);
    return ResponseEntity.ok(response);
  }
}
