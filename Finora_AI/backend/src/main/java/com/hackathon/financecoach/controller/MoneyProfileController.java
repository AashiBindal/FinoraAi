package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Request.MoneyProfileRequest;
import com.hackathon.financecoach.dto.Response.FinancialHealthResponse;
import com.hackathon.financecoach.dto.Response.MoneyProfileResponse;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.MoneyProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class MoneyProfileController {

  private final MoneyProfileService moneyProfileService;

  @PostMapping
  public ResponseEntity<MoneyProfileResponse> createOrUpdateProfile(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @Valid @RequestBody MoneyProfileRequest request) {
    MoneyProfileResponse response = moneyProfileService.createOrUpdateProfile(currentUser.getId(), request);
    return new ResponseEntity<>(response, HttpStatus.OK);
  }

  @GetMapping
  public ResponseEntity<MoneyProfileResponse> getProfile(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    MoneyProfileResponse response = moneyProfileService.getProfileByUserId(currentUser.getId());
    return ResponseEntity.ok(response);
  }

  @PutMapping
  public ResponseEntity<MoneyProfileResponse> updateProfile(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @Valid @RequestBody MoneyProfileRequest request) {
    MoneyProfileResponse response = moneyProfileService.createOrUpdateProfile(currentUser.getId(), request);
    return ResponseEntity.ok(response);
  }

  @GetMapping("/overview")
  public ResponseEntity<FinancialHealthResponse> getFinancialHealthOverview(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    FinancialHealthResponse response = moneyProfileService.getFinancialHealth(currentUser.getId());
    return ResponseEntity.ok(response);
  }
}
