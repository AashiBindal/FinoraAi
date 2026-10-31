package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Request.*;

public interface SettingsService {
  com.hackathon.financecoach.dto.settings.UserProfileResponseDTO getUserProfile(String email);
  com.hackathon.financecoach.dto.settings.UserProfileResponseDTO updateProfile(String email, UpdateProfileRequestDTO requestDTO);
  com.hackathon.financecoach.dto.settings.UserProfileResponseDTO updatePreferences(String email, UpdatePreferencesRequestDTO requestDTO);

  void changePassword(String email, com.hackathon.financecoach.dto.settings.ChangePasswordRequestDTO requestDTO);
}
