package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Request.UpdateProfileRequest;
import com.hackathon.financecoach.dto.Response.UserProfileResponse;
import com.hackathon.financecoach.entity.User;

public interface UserService {

  User getById(Long id);

  UserProfileResponse getProfile(Long userId);

  UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request);
}
