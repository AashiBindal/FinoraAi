package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Response.DashboardResponse;

public interface DashboardService {
  DashboardResponse getDashboardData(Long userId);
}
