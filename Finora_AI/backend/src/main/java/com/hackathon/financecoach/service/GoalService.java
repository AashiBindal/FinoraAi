package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Request.GoalContributionRequest;
import com.hackathon.financecoach.dto.Request.GoalRequest;
import com.hackathon.financecoach.dto.Response.GoalResponse;
import com.hackathon.financecoach.dto.Response.GoalSummaryResponse;
import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GoalService {
  GoalResponse createGoal(Long userId, GoalRequest request);

  Page<GoalResponse> getFilteredGoals(Long userId, GoalStatus status, GoalCategory category, Pageable pageable);

  GoalResponse getGoalById(Long userId, Long goalId);

  GoalResponse updateGoal(Long userId, Long goalId, GoalRequest request);

  GoalResponse addContribution(Long userId, Long goalId, GoalContributionRequest request);

  void deleteGoal(Long userId, Long goalId);

  GoalSummaryResponse getGoalSummary(Long userId);
}
