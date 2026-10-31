package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.BudgetDTOs.BudgetRequest;
import com.hackathon.financecoach.dto.BudgetDTOs.BudgetResponse;
import com.hackathon.financecoach.dto.BudgetDTOs.BudgetStatusResponse;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.BudgetService;
import com.hackathon.financecoach.service.ServiceImpl.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
@Tag(name = "Budgets", description = "Monthly category and overall budget management")
@SecurityRequirement(name = "Bearer Authentication")
@CrossOrigin(origins = "*")
public class BudgetController {

    private final BudgetService budgetService;
    private final UserService userService;

    @PostMapping
    @Operation(summary = "Create category or total budget", description = "Sets a spending limit for a specific category or total monthly cap. Triggers living model refresh.")
    public ResponseEntity<BudgetResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BudgetRequest request
    ) {
        User user = userService.getById(principal.getId());
        BudgetResponse response = budgetService.createBudget(user, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "List budgets", description = "Returns all category and overall budgets configured for the specified month.")
    public ResponseEntity<List<BudgetResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String month
    ) {
        User user = userService.getById(principal.getId());
        LocalDate targetMonth = LocalDate.now();
        if (month != null && !month.isBlank()) {
            YearMonth ym = YearMonth.parse(month);
            targetMonth = ym.atDay(1);
        }
        return ResponseEntity.ok(budgetService.listBudgets(user, targetMonth));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update budget limit", description = "Updates an existing budget limit and re-evaluates utilization alerts.")
    public ResponseEntity<BudgetResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody BudgetRequest request
    ) {
        User user = userService.getById(principal.getId());
        return ResponseEntity.ok(budgetService.updateBudget(user, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete budget", description = "Deletes a budget limit.")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        User user = userService.getById(principal.getId());
        budgetService.deleteBudget(user, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status")
    @Operation(summary = "Get budget status and alerts", description = "Calculates budget utilization percentages, remaining amounts, and triggered overspending alerts.")
    public ResponseEntity<BudgetStatusResponse> getStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String month
    ) {
        User user = userService.getById(principal.getId());
        LocalDate targetMonth = LocalDate.now();
        if (month != null && !month.isBlank()) {
            YearMonth ym = YearMonth.parse(month);
            targetMonth = ym.atDay(1);
        }
        return ResponseEntity.ok(budgetService.getBudgetStatus(user, targetMonth));
    }
}
