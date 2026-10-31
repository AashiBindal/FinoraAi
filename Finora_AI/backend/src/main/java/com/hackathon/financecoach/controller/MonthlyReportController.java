package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Response.MonthlyReportResponse;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.MonthlyReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports/monthly")
@RequiredArgsConstructor
public class MonthlyReportController {

  private final MonthlyReportService monthlyReportService;

  @GetMapping
  public ResponseEntity<MonthlyReportResponse> getMonthlyReport(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @RequestParam int year,
    @RequestParam int month) {
    MonthlyReportResponse response = monthlyReportService.generateMonthlyReport(currentUser.getId(), year, month);
    return ResponseEntity.ok(response);
  }
}
