//package com.hackathon.financecoach.security;
//
//import com.hackathon.financecoach.entity.User;
//import com.hackathon.financecoach.model.RiskPreference;
//import com.hackathon.financecoach.repository.UserRepository;
//import com.hackathon.financecoach.service.DemoSeedService;
//import jakarta.servlet.http.HttpServletRequest;
//import jakarta.servlet.http.HttpServletResponse;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.security.core.Authentication;
//import org.springframework.security.crypto.password.PasswordEncoder;
//import org.springframework.security.oauth2.core.user.OAuth2User;
//import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
//import org.springframework.stereotype.Component;
//import org.springframework.web.util.UriComponentsBuilder;
//
//import java.io.IOException;
//import java.math.BigDecimal;
//import java.util.Map;
//import java.util.UUID;
//
//@Component
//@RequiredArgsConstructor
//@Slf4j
//public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
//
//    private final JwtService jwtService;
//    private final UserRepository userRepository;
//    private final PasswordEncoder passwordEncoder;
//    private final DemoSeedService demoSeedService;
//
//    @Value("${app.oauth2.redirect-uri:http://localhost:5173/dashboard}")
//    private String redirectUri;
//
//    @Override
//    public void onAuthenticationSuccess(
//            HttpServletRequest request,
//            HttpServletResponse response,
//            Authentication authentication
//    ) throws IOException {
//
//        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
//        Map<String, Object> attributes = oAuth2User.getAttributes();
//
//        // 1. Extract email and name safely across providers (Google, GitHub, etc.)
//        String email = extractEmail(attributes);
//        String name = extractName(attributes, email);
//
//        log.info("OAuth2 login successful for email: {}, name: {}", email, name);
//
//        // 2. Find or register user in database
//        boolean isNewUser = false;
//        User user = userRepository.findByEmail(email).orElse(null);
//
//        if (user == null) {
//            isNewUser = true;
//            log.info("Registering new OAuth2 user: {}", email);
//            user = User.builder()
//                    .fullName(name)
//                    .email(email)
//                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
//                    .currency("INR")
//                    .monthlyIncomeTarget(new BigDecimal("85000.00"))
//                    .savingsGoalPercent(new BigDecimal("30.00"))
//                    .riskPreference(RiskPreference.MEDIUM)
//                    .financialGoalsText("Build emergency buffer and long-term investment portfolio")
//                    .build();
//            user = userRepository.save(user);
//
//            // Automatically bootstrap demo financial ledger so dashboard is immediately rich with data
//            try {
//                demoSeedService.seedUserData(user);
//            } catch (Exception ex) {
//                log.warn("Failed to seed initial ledger for OAuth user: {}", ex.getMessage());
//            }
//        }
//
//        // 3. Generate JWT Token
//        UserPrincipal principal = UserPrincipal.fromUser(user);
//        String token = jwtService.generateToken(principal);
//
//        // 4. Redirect to Frontend Dashboard with JWT token in query parameter
//        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
//                .queryParam("token", token)
//                .queryParam("userId", user.getId())
//                .queryParam("email", user.getEmail())
//                .queryParam("name", user.getFullName())
//                .queryParam("isNewUser", isNewUser)
//                .build().toUriString();
//
//        log.info("Redirecting authenticated OAuth2 user to dashboard: {}", targetUrl);
//        getRedirectStrategy().sendRedirect(request, response, targetUrl);
//    }
//
//    private String extractEmail(Map<String, Object> attributes) {
//        if (attributes.get("email") != null) {
//            return attributes.get("email").toString().toLowerCase().trim();
//        }
//        if (attributes.get("login") != null) {
//            return attributes.get("login").toString().toLowerCase().trim() + "@oauth.local";
//        }
//        if (attributes.get("sub") != null) {
//            return "user-" + attributes.get("sub").toString() + "@oauth.local";
//        }
//        return "oauth-" + UUID.randomUUID().toString().substring(0, 8) + "@oauth.local";
//    }
//
//    private String extractName(Map<String, Object> attributes, String fallbackEmail) {
//        if (attributes.get("name") != null) {
//            return attributes.get("name").toString();
//        }
//        if (attributes.get("login") != null) {
//            return attributes.get("login").toString();
//        }
//        return fallbackEmail.contains("@") ? fallbackEmail.substring(0, fallbackEmail.indexOf('@')) : "OAuth User";
//    }
//}
