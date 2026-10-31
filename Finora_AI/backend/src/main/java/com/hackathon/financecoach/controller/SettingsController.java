package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Request.UpdatePreferencesRequestDTO;
import com.hackathon.financecoach.dto.Request.UpdateProfileRequestDTO;
import com.hackathon.financecoach.dto.Response.MessageResponseDTO;
import com.hackathon.financecoach.dto.settings.ChangePasswordRequestDTO;
import com.hackathon.financecoach.dto.settings.UserProfileResponseDTO;
import com.hackathon.financecoach.service.SettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

  private final SettingsService settingsService;

  @GetMapping("/profile")
  public ResponseEntity<UserProfileResponseDTO> getUserProfile(@AuthenticationPrincipal UserDetails userDetails) {
    String email = userDetails.getUsername();
    UserProfileResponseDTO profile = settingsService.getUserProfile(email);
    return ResponseEntity.ok(profile);
  }

  @PutMapping("/profile")
  public ResponseEntity<UserProfileResponseDTO> updateProfile(
    @AuthenticationPrincipal UserDetails userDetails,
    @Valid @RequestBody UpdateProfileRequestDTO requestDTO) {
    String email = userDetails.getUsername();
    UserProfileResponseDTO updatedProfile = settingsService.updateProfile(email, requestDTO);
    return ResponseEntity.ok(updatedProfile);
  }

  @PutMapping("/preferences")
  public ResponseEntity<UserProfileResponseDTO> updatePreferences(
    @AuthenticationPrincipal UserDetails userDetails,
    @Valid @RequestBody UpdatePreferencesRequestDTO requestDTO) {
    String email = userDetails.getUsername();
    UserProfileResponseDTO updatedPreferences = settingsService.updatePreferences(email, requestDTO);
    return ResponseEntity.ok(updatedPreferences);
  }

  @PostMapping("/password")
  public ResponseEntity<MessageResponseDTO> changePassword(
    @AuthenticationPrincipal UserDetails userDetails,
    @Valid @RequestBody ChangePasswordRequestDTO requestDTO) {
    String email = userDetails.getUsername();
    settingsService.changePassword(email, requestDTO);
    return ResponseEntity.ok(MessageResponseDTO.builder()
      .success(true)
      .message("Password changed successfully.")
      .build());
  }
}
