
package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.Request.UpdatePreferencesRequestDTO;
import com.hackathon.financecoach.dto.Request.UpdateProfileRequestDTO;
import com.hackathon.financecoach.dto.settings.UserProfileResponseDTO;
import com.hackathon.financecoach.dto.settings.ChangePasswordRequestDTO;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.RiskPreference;
import com.hackathon.financecoach.repository.UserRepository;
import com.hackathon.financecoach.service.SettingsService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class SettingsServiceImpl implements SettingsService {

  private final UserRepository userRepository;

  @Override
  @Transactional(readOnly = true)
  public UserProfileResponseDTO getUserProfile(String email) {
    User user = findUserByEmail(email);
    return mapToProfileDTO(user);
  }

  @Override
  @Transactional
  public UserProfileResponseDTO updateProfile(
    String email,
    UpdateProfileRequestDTO requestDTO) {

    User user = findUserByEmail(email);

    if (requestDTO.getEmail() != null
      && !user.getEmail().equalsIgnoreCase(requestDTO.getEmail())
      && userRepository.existsByEmail(requestDTO.getEmail())) {

      throw new IllegalArgumentException(
        "Email is already in use by another account."
      );
    }

    user.setFullName(requestDTO.getFullName());
    user.setEmail(requestDTO.getEmail());

    User updatedUser = userRepository.save(user);

    return mapToProfileDTO(updatedUser);
  }

  @Transactional
  @Override
  public UserProfileResponseDTO updatePreferences(
    String email,
    UpdatePreferencesRequestDTO requestDTO) {

    User user = findUserByEmail(email);

    user.setCurrency(requestDTO.getCurrency());
    user.setMonthlyIncomeTarget(BigDecimal.valueOf(requestDTO.getMonthlyIncomeTarget()));
    user.setSavingsGoalPercentage(requestDTO.getSavingsGoalPercentage());
    user.setRiskPreference(RiskPreference.valueOf(requestDTO.getRiskPreference()));

    User updatedUser = userRepository.save(user);

    return mapToProfileDTO(updatedUser);
  }

  @Override
  @Transactional
  public void changePassword(
    String email,
    ChangePasswordRequestDTO requestDTO) {

    if (!requestDTO.getNewPassword()
      .equals(requestDTO.getConfirmPassword())) {

      throw new IllegalArgumentException(
        "New password and confirmation password do not match."
      );
    }

    User user = findUserByEmail(email);


    userRepository.save(user);
  }

  private User findUserByEmail(String email) {
    return userRepository.findByEmail(email)
      .orElseThrow(() ->
        new IllegalArgumentException("User not found.")
      );
  }


  private UserProfileResponseDTO mapToProfileDTO(User user) {

    return UserProfileResponseDTO.builder()
      .id(user.getId())
      .fullName(user.getFullName())
      .email(user.getEmail())
      .currency(user.getCurrency() != null
        ? user.getCurrency() : "USD").monthlyIncomeTarget(user.getMonthlyIncomeTarget() != null
        ? user.getMonthlyIncomeTarget().doubleValue() : 0.0)

      .riskPreference(user.getRiskPreference() != null
        ? user.getRiskPreference().name() : "MODERATE")
      .savingsGoalPercentage(user.getSavingsGoalPercentage() != null
        ? user.getSavingsGoalPercentage() : 20.0)
      .build();
  }

}
