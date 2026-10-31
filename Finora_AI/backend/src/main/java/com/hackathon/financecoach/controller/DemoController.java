package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.DemoSeedService;
import com.hackathon.financecoach.service.ServiceImpl.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
@Tag(name = "Demo", description = "Automated demo data seeding")
@SecurityRequirement(name = "Bearer Authentication")
@CrossOrigin(origins = "*")
public class DemoController {

    private final DemoSeedService demoSeedService;
    private final UserService userService;

    @PostMapping("/seed")
    @Operation(summary = "Seed demo data for authenticated user", description = "Populates 4 months of realistic Indian transactions (salary ₹85,000, rent, grocery, food delivery, subscriptions, investments), 2 budgets, and 2 goals.")
    public ResponseEntity<Map<String, Object>> seedData(@AuthenticationPrincipal UserPrincipal principal) {
        User user = userService.getById(principal.getId());
        demoSeedService.seedUserData(user);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Successfully seeded 4 months of financial data for " + user.getEmail(),
                "sampleCredentials", "demo@finance.com / Demo@1234"
        ));
    }
}
