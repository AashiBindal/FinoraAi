package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Response.CategorySpendingResponse;
import com.hackathon.financecoach.dto.Response.DashboardAnalyticsResponse;
import com.hackathon.financecoach.dto.Response.FinancialOverviewResponse;
import com.hackathon.financecoach.dto.response.TrendDataPoint;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

  private final AnalyticsService analyticsService;

  @GetMapping("/overview")
  public ResponseEntity<FinancialOverviewResponse> getOverview(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    FinancialOverviewResponse response = analyticsService.getFinancialOverview(currentUser.getId(), startDate, endDate);
    return ResponseEntity.ok(response);
  }

  @GetMapping("/trends")
  public ResponseEntity<List<TrendDataPoint>> getTrends(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    List<TrendDataPoint> response = analyticsService.getIncomeExpenseTrends(currentUser.getId());
    return ResponseEntity.ok(response);
  }

  @GetMapping("/category-spending")
  public ResponseEntity<CategorySpendingResponse> getCategorySpending(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    CategorySpendingResponse response = analyticsService.getCategorySpending(currentUser.getId(), startDate, endDate);
    return ResponseEntity.ok(response);
  }

  @GetMapping("/dashboard")
  public ResponseEntity<DashboardAnalyticsResponse> getDashboard(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    DashboardAnalyticsResponse response = analyticsService.getCompleteDashboard(currentUser.getId());
    return ResponseEntity.ok(response);
  }
}
