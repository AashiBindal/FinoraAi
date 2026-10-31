package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Response.DashboardResponse;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

  private final DashboardService dashboardService;

  @GetMapping
  public ResponseEntity<DashboardResponse> getDashboard(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    DashboardResponse response = dashboardService.getDashboardData(currentUser.getId());
    return ResponseEntity.ok(response);
  }
}
