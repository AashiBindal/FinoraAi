package com.hackathon.financecoach.dto.Response;

public record AuthResponse(
  String accessToken,
  String refreshToken,
  Long userId,
  String name,
  String email,
  String role
) {
}
