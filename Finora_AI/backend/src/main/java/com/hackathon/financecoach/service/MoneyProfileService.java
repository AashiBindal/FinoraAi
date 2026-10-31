package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Request.MoneyProfileRequest;
import com.hackathon.financecoach.dto.Response.FinancialHealthResponse;
import com.hackathon.financecoach.dto.Response.MoneyProfileResponse;
import com.hackathon.financecoach.entity.MoneyProfile;

public interface MoneyProfileService {
  MoneyProfileResponse createOrUpdateProfile(Long userId, MoneyProfileRequest request);
  MoneyProfileResponse getProfileByUserId(Long userId);
  FinancialHealthResponse getFinancialHealth(Long userId);
  int calculateProfileCompletion(MoneyProfile profile);
}
