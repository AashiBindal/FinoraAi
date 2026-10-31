package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Response.AuthResponse;
import com.hackathon.financecoach.dto.Request.LoginRequest;
import com.hackathon.financecoach.dto.Request.RegisterRequest;
import com.hackathon.financecoach.dto.Request.SocialLoginRequest;

public interface AuthService {

  AuthResponse register(RegisterRequest request);

  AuthResponse login(LoginRequest request);

  AuthResponse socialLogin(SocialLoginRequest request);
}
