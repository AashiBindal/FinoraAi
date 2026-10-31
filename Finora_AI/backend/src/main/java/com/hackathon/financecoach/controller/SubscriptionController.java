package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Request.SubscriptionRequest;
import com.hackathon.financecoach.dto.Response.SubscriptionResponse;
import com.hackathon.financecoach.dto.Response.SubscriptionSummaryResponse;
import com.hackathon.financecoach.model.SubscriptionStatus;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

  private final SubscriptionService subscriptionService;

  @PostMapping
  public ResponseEntity<SubscriptionResponse> createSubscription(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @Valid @RequestBody SubscriptionRequest request) {
    SubscriptionResponse response = subscriptionService.createSubscription(currentUser.getId(), request);
    return new ResponseEntity<>(response, HttpStatus.CREATED);
  }

  @GetMapping
  public ResponseEntity<Page<SubscriptionResponse>> getSubscriptions(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @RequestParam(required = false) SubscriptionStatus status,
    @RequestParam(required = false) TransactionCategory category,
    @RequestParam(required = false) String keyword,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(defaultValue = "nextBillingDate") String sortBy,
    @RequestParam(defaultValue = "ASC") String direction) {

    Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
    Pageable pageable = PageRequest.of(page, size, sort);

    Page<SubscriptionResponse> response = subscriptionService.getFilteredSubscriptions(
      currentUser.getId(), status, category, keyword, pageable
    );
    return ResponseEntity.ok(response);
  }

  @GetMapping("/{id}")
  public ResponseEntity<SubscriptionResponse> getSubscriptionById(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id) {
    SubscriptionResponse response = subscriptionService.getSubscriptionById(currentUser.getId(), id);
    return ResponseEntity.ok(response);
  }

  @PutMapping("/{id}")
  public ResponseEntity<SubscriptionResponse> updateSubscription(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id,
    @Valid @RequestBody SubscriptionRequest request) {
    SubscriptionResponse response = subscriptionService.updateSubscription(currentUser.getId(), id, request);
    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteSubscription(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id) {
    subscriptionService.deleteSubscription(currentUser.getId(), id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/summary")
  public ResponseEntity<SubscriptionSummaryResponse> getSubscriptionSummary(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    SubscriptionSummaryResponse response = subscriptionService.getSubscriptionSummary(currentUser.getId());
    return ResponseEntity.ok(response);
  }
}
