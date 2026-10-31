package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Request.SubscriptionRequest;
import com.hackathon.financecoach.dto.Response.SubscriptionResponse;
import com.hackathon.financecoach.dto.Response.SubscriptionSummaryResponse;
import com.hackathon.financecoach.model.SubscriptionStatus;
import com.hackathon.financecoach.model.TransactionCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SubscriptionService {
  SubscriptionResponse createSubscription(Long userId, SubscriptionRequest request);

  Page<SubscriptionResponse> getFilteredSubscriptions(
    Long userId,
    SubscriptionStatus status,
    TransactionCategory category,
    String keyword,
    Pageable pageable
  );

  SubscriptionResponse getSubscriptionById(Long userId, Long subscriptionId);

  SubscriptionResponse updateSubscription(Long userId, Long subscriptionId, SubscriptionRequest request);

  void deleteSubscription(Long userId, Long subscriptionId);

  SubscriptionSummaryResponse getSubscriptionSummary(Long userId);
}
