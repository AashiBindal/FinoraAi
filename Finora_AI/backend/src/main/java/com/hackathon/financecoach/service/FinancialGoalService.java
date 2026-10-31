package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.GoalDTOs.GoalRequest;
import com.hackathon.financecoach.dto.GoalDTOs.GoalResponse;
import com.hackathon.financecoach.entity.FinancialGoal;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.exception.ResourceNotFoundException;
import com.hackathon.financecoach.model.GoalStatus;
import com.hackathon.financecoach.repository.FinancialGoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FinancialGoalService {

    private final FinancialGoalRepository goalRepo;
    private final ApplicationEventPublisher eventPublisher;

    public List<GoalResponse> listGoals(User user) {
        return goalRepo.findByUserIdOrderByTargetDateAsc(user.getId()).stream()
                .map(GoalResponse::fromEntity)
                .toList();
    }

    public GoalResponse getById(User user, Long id) {
        FinancialGoal g = goalRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));
        return GoalResponse.fromEntity(g);
    }

    @Transactional
    public GoalResponse createGoal(User user, GoalRequest request) {
        FinancialGoal g = FinancialGoal.builder()
                .user(user)
                .title(request.name().trim())
                .category(com.hackathon.financecoach.model.GoalCategory.OTHER)
                .targetAmount(request.targetAmount())
                .currentAmount(request.savedAmount() != null ? request.savedAmount() : BigDecimal.ZERO)
                .targetDate(request.targetDate())
                .status(request.status() != null ? request.status() : GoalStatus.ACTIVE)
                .build();

        FinancialGoal saved = goalRepo.save(g);
        eventPublisher.publishEvent(new LivingMoneyModelService.ModelRefreshEvent(user.getId()));
        return GoalResponse.fromEntity(saved);
    }

    @Transactional
    public GoalResponse updateGoal(User user, Long id, GoalRequest request) {
        FinancialGoal g = goalRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));

        g.setTitle(request.name().trim());
        g.setTargetAmount(request.targetAmount());
        if (request.savedAmount() != null) g.setCurrentAmount(request.savedAmount());
        g.setTargetDate(request.targetDate());
        if (request.status() != null) g.setStatus(request.status());

        FinancialGoal saved = goalRepo.save(g);
        eventPublisher.publishEvent(new LivingMoneyModelService.ModelRefreshEvent(user.getId()));
        return GoalResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteGoal(User user, Long id) {
        FinancialGoal g = goalRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));

        goalRepo.delete(g);
        eventPublisher.publishEvent(new LivingMoneyModelService.ModelRefreshEvent(user.getId()));
    }
}
