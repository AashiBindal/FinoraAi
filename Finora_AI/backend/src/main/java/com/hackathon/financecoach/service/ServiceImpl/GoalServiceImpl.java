package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.Request.GoalContributionRequest;
import com.hackathon.financecoach.dto.Request.GoalRequest;
import com.hackathon.financecoach.dto.Response.GoalResponse;
import com.hackathon.financecoach.dto.Response.GoalSummaryResponse;
import com.hackathon.financecoach.entity.FinancialGoal;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
import com.hackathon.financecoach.repository.FinancialGoalRepository;
import com.hackathon.financecoach.repository.UserRepository;
import com.hackathon.financecoach.service.GoalService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GoalServiceImpl implements GoalService {

  private final FinancialGoalRepository goalRepository;
  private final UserRepository userRepository;

  @Override
  @Transactional
  public GoalResponse createGoal(Long userId, GoalRequest request) {
    User user = userRepository.findById(userId)
      .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

    GoalStatus status = request.getStatus() != null ? request.getStatus() : GoalStatus.ACTIVE;
    BigDecimal currentAmount = request.getCurrentAmount() != null ? request.getCurrentAmount() : BigDecimal.ZERO;

    if (currentAmount.compareTo(request.getTargetAmount()) >= 0) {
      status = GoalStatus.COMPLETED;
    } else if (request.getTargetDate().isBefore(LocalDate.now())) {
      status = GoalStatus.OVERDUE;
    }

    FinancialGoal goal = FinancialGoal.builder()
      .user(user)
      .title(request.getTitle())
      .description(request.getDescription())
      .targetAmount(request.getTargetAmount())
      .currentAmount(currentAmount)
      .category(request.getCategory())
      .targetDate(request.getTargetDate())
      .priority(request.getPriority())
      .status(status)
      .monthlyContributionTarget(request.getMonthlyContributionTarget())
      .build();

    FinancialGoal saved = goalRepository.save(goal);
    return mapToResponse(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public Page<GoalResponse> getFilteredGoals(Long userId, GoalStatus status, GoalCategory category, Pageable pageable) {
    Page<FinancialGoal> page = goalRepository.findFilteredGoals(userId, status, category, pageable);
    return page.map(this::mapToResponse);
  }

  @Override
  @Transactional(readOnly = true)
  public GoalResponse getGoalById(Long userId, Long goalId) {
    FinancialGoal goal = goalRepository.findByIdAndUserId(goalId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Financial goal not found or unauthorized access"));
    updateGoalStatusIfNeeded(goal);
    return mapToResponse(goal);
  }

  @Override
  @Transactional
  public GoalResponse updateGoal(Long userId, Long goalId, GoalRequest request) {
    FinancialGoal goal = goalRepository.findByIdAndUserId(goalId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Financial goal not found or unauthorized access"));

    goal.setTitle(request.getTitle());
    goal.setDescription(request.getDescription());
    goal.setTargetAmount(request.getTargetAmount());
    if (request.getCurrentAmount() != null) {
      goal.setCurrentAmount(request.getCurrentAmount());
    }
    goal.setCategory(request.getCategory());
    goal.setTargetDate(request.getTargetDate());
    goal.setPriority(request.getPriority());
    if (request.getStatus() != null) {
      goal.setStatus(request.getStatus());
    }
    goal.setMonthlyContributionTarget(request.getMonthlyContributionTarget());

    updateGoalStatusIfNeeded(goal);
    FinancialGoal updated = goalRepository.save(goal);
    return mapToResponse(updated);
  }

  @Override
  @Transactional
  public GoalResponse addContribution(Long userId, Long goalId, GoalContributionRequest request) {
    FinancialGoal goal = goalRepository.findByIdAndUserId(goalId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Financial goal not found or unauthorized access"));

    BigDecimal newAmount = goal.getCurrentAmount().add(request.getAmount());
    goal.setCurrentAmount(newAmount);

    updateGoalStatusIfNeeded(goal);
    FinancialGoal saved = goalRepository.save(goal);
    return mapToResponse(saved);
  }

  @Override
  @Transactional
  public void deleteGoal(Long userId, Long goalId) {
    FinancialGoal goal = goalRepository.findByIdAndUserId(goalId, userId)
      .orElseThrow(() -> new EntityNotFoundException("Financial goal not found or unauthorized access"));
    goalRepository.delete(goal);
  }

  @Override
  @Transactional(readOnly = true)
  public GoalSummaryResponse getGoalSummary(Long userId) {
    List<FinancialGoal> allGoals = goalRepository.findByUserId(userId);

    for (FinancialGoal goal : allGoals) {
      updateGoalStatusIfNeeded(goal);
    }

    long totalGoals = allGoals.size();
    long activeGoals = allGoals.stream().filter(g -> g.getStatus() == GoalStatus.ACTIVE).count();
    long completedGoals = allGoals.stream().filter(g -> g.getStatus() == GoalStatus.COMPLETED).count();
    long overdueGoals = allGoals.stream().filter(g -> g.getStatus() == GoalStatus.OVERDUE).count();

    BigDecimal totalTargetAmount = allGoals.stream()
      .map(FinancialGoal::getTargetAmount)
      .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal totalSavedAmount = allGoals.stream()
      .map(FinancialGoal::getCurrentAmount)
      .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal totalRemainingAmount = totalTargetAmount.subtract(totalSavedAmount);
    if (totalRemainingAmount.compareTo(BigDecimal.ZERO) < 0) {
      totalRemainingAmount = BigDecimal.ZERO;
    }

    BigDecimal overallProgress = BigDecimal.ZERO;
    if (totalTargetAmount.compareTo(BigDecimal.ZERO) > 0) {
      overallProgress = totalSavedAmount.multiply(BigDecimal.valueOf(100))
        .divide(totalTargetAmount, 2, RoundingMode.HALF_UP);
      if (overallProgress.compareTo(BigDecimal.valueOf(100)) > 0) {
        overallProgress = BigDecimal.valueOf(100);
      }
    }

    LocalDate today = LocalDate.now();
    LocalDate thirtyDaysLater = today.plusDays(30);
    List<FinancialGoal> upcomingList = goalRepository.findUpcomingDeadlines(userId, today, thirtyDaysLater);
    List<GoalResponse> upcomingDeadlines = upcomingList.stream().map(this::mapToResponse).collect(Collectors.toList());

    return GoalSummaryResponse.builder()
      .totalGoals(totalGoals)
      .activeGoals(activeGoals)
      .completedGoals(completedGoals)
      .overdueGoals(overdueGoals)
      .totalTargetAmount(totalTargetAmount)
      .totalSavedAmount(totalSavedAmount)
      .totalRemainingAmount(totalRemainingAmount)
      .overallProgressPercentage(overallProgress)
      .upcomingDeadlines(upcomingDeadlines)
      .build();
  }

  private void updateGoalStatusIfNeeded(FinancialGoal goal) {
    if (goal.getStatus() == GoalStatus.PAUSED || goal.getStatus() == GoalStatus.CANCELLED) {
      return;
    }

    if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
      goal.setStatus(GoalStatus.COMPLETED);
    } else if (goal.getTargetDate().isBefore(LocalDate.now())) {
      goal.setStatus(GoalStatus.OVERDUE);
    } else if (goal.getStatus() == GoalStatus.OVERDUE && !goal.getTargetDate().isBefore(LocalDate.now())) {
      goal.setStatus(GoalStatus.ACTIVE);
    }
  }

  private GoalResponse mapToResponse(FinancialGoal goal) {
    BigDecimal remaining = goal.getTargetAmount().subtract(goal.getCurrentAmount());
    if (remaining.compareTo(BigDecimal.ZERO) < 0) {
      remaining = BigDecimal.ZERO;
    }

    BigDecimal percentage = BigDecimal.ZERO;
    if (goal.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
      percentage = goal.getCurrentAmount().multiply(BigDecimal.valueOf(100))
        .divide(goal.getTargetAmount(), 2, RoundingMode.HALF_UP);
      if (percentage.compareTo(BigDecimal.valueOf(100)) > 0) {
        percentage = BigDecimal.valueOf(100);
      }
    }

    // Required monthly contribution calculation
    BigDecimal requiredMonthly = BigDecimal.ZERO;
    if (goal.getStatus() == GoalStatus.ACTIVE && remaining.compareTo(BigDecimal.ZERO) > 0) {
      long monthsBetween = ChronoUnit.MONTHS.between(LocalDate.now(), goal.getTargetDate());
      if (monthsBetween <= 0) {
        requiredMonthly = remaining;
      } else {
        requiredMonthly = remaining.divide(BigDecimal.valueOf(monthsBetween), 2, RoundingMode.HALF_UP);
      }
    }

    return GoalResponse.builder()
      .id(goal.getId())
      .title(goal.getTitle())
      .description(goal.getDescription())
      .targetAmount(goal.getTargetAmount())
      .currentAmount(goal.getCurrentAmount())
      .remainingAmount(remaining)
      .progressPercentage(percentage)
      .category(goal.getCategory())
      .targetDate(goal.getTargetDate())
      .priority(goal.getPriority())
      .status(goal.getStatus())
      .monthlyContributionTarget(goal.getMonthlyContributionTarget())
      .requiredMonthlyContribution(requiredMonthly)
      .createdAt(goal.getCreatedAt())
      .updatedAt(goal.getUpdatedAt())
      .build();
  }
}
