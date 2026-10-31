package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.AuthDTOs.AuthResponse;
import com.hackathon.financecoach.dto.AuthDTOs.LoginRequest;
import com.hackathon.financecoach.dto.AuthDTOs.RegisterRequest;
import com.hackathon.financecoach.dto.Request.SocialLoginRequest;
import com.hackathon.financecoach.service.ServiceImpl.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "User registration, password authentication and OAuth2 social login")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Creates a new user account with encrypted password and returns a JWT token.")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Validates user credentials and issues a JWT Bearer token.")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/oauth2/callback")
    @Operation(summary = "OAuth2 / Social Login Callback", description = "Direct SPA social login (Google, GitHub, etc.). Creates user if not existing, seeds demo ledger, and issues JWT Bearer token.")
    public ResponseEntity<AuthResponse> socialLogin(@Valid @RequestBody SocialLoginRequest request) {
        AuthResponse response = authService.socialLogin(request);
        return ResponseEntity.ok(response);
    }
}
