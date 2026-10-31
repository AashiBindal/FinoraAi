package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.UserDTOs.UpdateProfileRequest;
import com.hackathon.financecoach.dto.UserDTOs.UserProfileResponse;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.exception.ResourceNotFoundException;
import com.hackathon.financecoach.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    public UserProfileResponse getProfile(Long userId) {
        User user = getById(userId);
        return UserProfileResponse.fromEntity(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getById(userId);
        user.setFullName(request.fullName().trim());
        if (request.currency() != null && !request.currency().isBlank()) {
            user.setCurrency(request.currency().trim().toUpperCase());
        }
        if (request.monthlyIncomeTarget() != null) {
            user.setMonthlyIncomeTarget(request.monthlyIncomeTarget());
        }
        if (request.savingsGoalPercent() != null) {
            user.setSavingsGoalPercent(request.savingsGoalPercent());
        }
        if (request.riskPreference() != null) {
            user.setRiskPreference(request.riskPreference());
        }
        if (request.financialGoalsText() != null) {
            user.setFinancialGoalsText(request.financialGoalsText());
        }

        User updated = userRepository.save(user);
        return UserProfileResponse.fromEntity(updated);
    }
}
