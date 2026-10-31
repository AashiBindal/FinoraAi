package com.hackathon.financecoach.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class OAuth2DTOs {

    public record SocialLoginRequest(
            @NotBlank(message = "Provider is required (e.g. GOOGLE, GITHUB)")
            String provider,

            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Full name is required")
            String fullName,

            String providerId,

            String avatarUrl
    ) {}
}
