package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.dto.AuthDTOs.*;
import com.hackathon.financecoach.dto.Request.SocialLoginRequest;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.exception.BadRequestException;
import com.hackathon.financecoach.exception.DuplicateResourceException;
import com.hackathon.financecoach.exception.UnauthorizedException;
import com.hackathon.financecoach.model.RiskPreference;
import com.hackathon.financecoach.repository.UserRepository;
import com.hackathon.financecoach.security.JwtService;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.DemoSeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final DemoSeedService demoSeedService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email().toLowerCase().trim())) {
            throw new DuplicateResourceException("An account with email " + request.email() + " already exists");
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(request.email().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .currency("INR")
                .build();

        User saved = userRepository.save(user);
        UserPrincipal principal = UserPrincipal.fromUser(saved);
        String token = jwtService.generateToken(principal);

        return AuthResponse.of(token, saved.getId(), saved.getEmail(), saved.getFullName(), saved.getCurrency());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().toLowerCase().trim(), request.password())
            );
        } catch (Exception ex) {
            throw new UnauthorizedException("Invalid email or password");
        }

        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        UserPrincipal principal = UserPrincipal.fromUser(user);
        String token = jwtService.generateToken(principal);

        return AuthResponse.of(token, user.getId(), user.getEmail(), user.getFullName(), user.getCurrency());
    }

    /**
     * Social login is DISABLED until the provider ID token is verified server-side
     * (e.g. Google's tokeninfo / JWKS). Trusting a client-supplied identity would let
     * anyone sign in as any email address.
     */
    public AuthResponse socialLogin(SocialLoginRequest request) {
        throw new BadRequestException("Social login is not available yet: provider ID-token verification is not implemented on the server.");
    }

    /** Creates or loads a user for a VERIFIED social identity. Call only after verifying the provider token. */
    @Transactional
    protected AuthResponse loginVerifiedSocialUser(String verifiedEmail, String verifiedFullName) {
        String email = verifiedEmail.toLowerCase().trim();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            log.info("Registering new user via social login: {}", email);
            user = User.builder()
                    .fullName(verifiedFullName.trim())
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .currency("INR")
                    .monthlyIncomeTarget(new BigDecimal("85000.00"))
                    .savingsGoalPercent(new BigDecimal("30.00"))
                    .riskPreference(RiskPreference.MEDIUM)
                    .financialGoalsText("Build emergency cushion and invest in index funds")
                    .build();
            user = userRepository.save(user);

            try {
                demoSeedService.seedUserData(user);
            } catch (Exception ex) {
                log.warn("Failed to seed initial ledger for social user: {}", ex.getMessage());
            }
        }

        UserPrincipal principal = UserPrincipal.fromUser(user);
        String token = jwtService.generateToken(principal);

        return AuthResponse.of(token, user.getId(), user.getEmail(), user.getFullName(), user.getCurrency());
    }
}
