package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.Request.SubscriptionRequest;
import com.hackathon.financecoach.dto.Response.SubscriptionResponse;
import com.hackathon.financecoach.dto.Response.SubscriptionSummaryResponse;
import com.hackathon.financecoach.entity.Subscription;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.SubscriptionStatus;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.repository.SubscriptionRepository;
import com.hackathon.financecoach.repository.UserRepository;
import com.hackathon.financecoach.service.SubscriptionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubscriptionServiceImpl implements SubscriptionService {

  private final SubscriptionRepository subscriptionRepository;
  private final UserRepository userRepository;

  @Override
  @Transactional
  public SubscriptionResponse createSubscription(Long userId, SubscriptionRequest request) {
    User user = userRepository.findById(userId)
      .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

    Subscription subscription = Subscription.builder()
      .user(user)
      .name(request.getName())
      .amount(request.getAmount())
      .billingCycle(request.getBillingCycle())
      .category(request.getCategory())
      .startDate(request.getStartDate())
      .nextBillingDate(request.getNextBillingDate())
      .paymentMethod(request.getPaymentMethod())
      .status(request.getStatus())
      .description(request.getDescription())
      .build();

    Subscription saved = subscriptionRepository.save(subscription);
    return mapToResponse(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public Page<SubscriptionResponse> getFilteredSubscriptions(
    Long userId,
    SubscriptionStatus status,
    TransactionCategory category,
    String keyword,
    Pageable pageable
  ) {
    Page<Subscription> page = subscriptionRepository.findFilteredSubscriptions(userId, status, category, keyword, pageable);
    return page.map(this::mapToResponse);
  }

  @Override
  @Transactional(readOnly = true)
  public SubscriptionResponse getSubscriptionById(Long userId, Long subscriptionId) {
    Subscription subscription = subscriptionRepository.findByIdAndUserId(subscriptionId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Subscription not found or unauthorized access"));
    return mapToResponse(subscription);
  }

  @Override
  @Transactional
  public SubscriptionResponse updateSubscription(Long userId, Long subscriptionId, SubscriptionRequest request) {
    Subscription subscription = subscriptionRepository.findByIdAndUserId(subscriptionId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Subscription not found or unauthorized access"));

    subscription.setName(request.getName());
    subscription.setAmount(request.getAmount());
    subscription.setBillingCycle(request.getBillingCycle());
    subscription.setCategory(request.getCategory());
    subscription.setStartDate(request.getStartDate());
    subscription.setNextBillingDate(request.getNextBillingDate());
    subscription.setPaymentMethod(request.getPaymentMethod());
    subscription.setStatus(request.getStatus());
    subscription.setDescription(request.getDescription());

    Subscription updated = subscriptionRepository.save(subscription);
    return mapToResponse(updated);
  }

  @Override
  @Transactional
  public void deleteSubscription(Long userId, Long subscriptionId) {
    Subscription subscription = subscriptionRepository.findByIdAndUserId(subscriptionId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Subscription not found or unauthorized access"));
    subscriptionRepository.delete(subscription);
  }

  @Override
  @Transactional(readOnly = true)
  public SubscriptionSummaryResponse getSubscriptionSummary(Long userId) {
    List<Subscription> activeSubscriptions = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);
    List<Subscription> pausedSubscriptions = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.PAUSED);
    List<Subscription> cancelledSubscriptions = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.CANCELLED);

    BigDecimal totalMonthlyCost = BigDecimal.ZERO;
    BigDecimal totalYearlyCost = BigDecimal.ZERO;
    Map<TransactionCategory, BigDecimal> categoryExpenseBreakdown = new HashMap<>();

    for (Subscription sub : activeSubscriptions) {
      BigDecimal monthlyEquivalent;
      BigDecimal yearlyEquivalent;

      switch (sub.getBillingCycle()) {
        case WEEKLY:
          monthlyEquivalent = sub.getAmount().multiply(BigDecimal.valueOf(52)).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
          yearlyEquivalent = sub.getAmount().multiply(BigDecimal.valueOf(52));
          break;
        case MONTHLY:
          monthlyEquivalent = sub.getAmount();
          yearlyEquivalent = sub.getAmount().multiply(BigDecimal.valueOf(12));
          break;
        case QUARTERLY:
          monthlyEquivalent = sub.getAmount().multiply(BigDecimal.valueOf(4)).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
          yearlyEquivalent = sub.getAmount().multiply(BigDecimal.valueOf(4));
          break;
        case YEARLY:
          monthlyEquivalent = sub.getAmount().divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
          yearlyEquivalent = sub.getAmount();
          break;
        default:
          monthlyEquivalent = sub.getAmount();
          yearlyEquivalent = sub.getAmount().multiply(BigDecimal.valueOf(12));
          break;
      }

      totalMonthlyCost = totalMonthlyCost.add(monthlyEquivalent);
      totalYearlyCost = totalYearlyCost.add(yearlyEquivalent);

      categoryExpenseBreakdown.put(
        sub.getCategory(),
        categoryExpenseBreakdown.getOrDefault(sub.getCategory(), BigDecimal.ZERO).add(monthlyEquivalent)
      );
    }

    LocalDate today = LocalDate.now();
    LocalDate thirtyDaysLater = today.plusDays(30);
    List<Subscription> upcomingList = subscriptionRepository.findUpcomingRenewals(userId, today, thirtyDaysLater);
    List<SubscriptionResponse> upcomingRenewals = upcomingList.stream().map(this::mapToResponse).collect(Collectors.toList());

    return SubscriptionSummaryResponse.builder()
      .totalActiveSubscriptions((long) activeSubscriptions.size())
      .totalPausedSubscriptions((long) pausedSubscriptions.size())
      .totalCancelledSubscriptions((long) cancelledSubscriptions.size())
      .totalMonthlyCost(totalMonthlyCost)
      .totalYearlyCost(totalYearlyCost)
      .upcomingRenewals(upcomingRenewals)
      .categoryExpenseBreakdown(categoryExpenseBreakdown)
      .build();
  }

  private SubscriptionResponse mapToResponse(Subscription sub) {
    return SubscriptionResponse.builder()
      .id(sub.getId())
      .name(sub.getName())
      .amount(sub.getAmount())
      .billingCycle(sub.getBillingCycle())
      .category(sub.getCategory())
      .startDate(sub.getStartDate())
      .nextBillingDate(sub.getNextBillingDate())
      .paymentMethod(sub.getPaymentMethod())
      .status(sub.getStatus())
      .description(sub.getDescription())
      .createdAt(sub.getCreatedAt())
      .updatedAt(sub.getUpdatedAt())
      .build();
  }
}
