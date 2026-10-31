package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.LivingMoneyModelDTOs.LivingMoneyModel;
import com.hackathon.financecoach.dto.LivingMoneyModelDTOs.MonthlyTrendPointDTO;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.LivingMoneyModelService;
import com.hackathon.financecoach.service.ServiceImpl.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
@Tag(name = "Finance", description = "Living Money Model engine, monthly financial summaries and trend analytics")
@SecurityRequirement(name = "Bearer Authentication")
@CrossOrigin(origins = "*")
public class FinanceController {

    private final LivingMoneyModelService modelService;
    private final UserService userService;

    @GetMapping("/model")
    @Operation(summary = "Get current Living Money Model", description = "Retrieves the user's real-time dynamic Living Money Model recalculated from PostgreSQL transactions and budgets.")
    public ResponseEntity<LivingMoneyModel> getCurrentLivingModel(@AuthenticationPrincipal UserPrincipal principal) {
        User user = userService.getById(principal.getId());
        return ResponseEntity.ok(modelService.getLivingModel(user, LocalDate.now()));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get monthly financial summary", description = "Retrieves the financial model and metrics for a specific month (format: YYYY-MM).")
    public ResponseEntity<LivingMoneyModel> getMonthlySummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String month
    ) {
        User user = userService.getById(principal.getId());
        LocalDate targetMonth = LocalDate.now();
        if (month != null && !month.isBlank()) {
            YearMonth ym = YearMonth.parse(month);
            targetMonth = ym.atDay(1);
        }
        return ResponseEntity.ok(modelService.getLivingModel(user, targetMonth));
    }

    @GetMapping("/trends")
    @Operation(summary = "Get multi-month spending trends", description = "Returns historical monthly income, expenses, savings and savings rate series.")
    public ResponseEntity<List<MonthlyTrendPointDTO>> getSpendingTrends(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "6") int months
    ) {
        User user = userService.getById(principal.getId());
        LivingMoneyModel model = modelService.getLivingModel(user, LocalDate.now());
        return ResponseEntity.ok(model.getSpendingTrends());
    }
}
