package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Response.CategorySpendingResponse;
import com.hackathon.financecoach.dto.Response.DashboardAnalyticsResponse;
import com.hackathon.financecoach.dto.Response.FinancialOverviewResponse;
import com.hackathon.financecoach.dto.response.TrendDataPoint;

import java.time.LocalDate;
import java.util.List;

public interface AnalyticsService {
  FinancialOverviewResponse getFinancialOverview(Long userId, LocalDate startDate, LocalDate endDate);
  List<TrendDataPoint> getIncomeExpenseTrends(Long userId);
  CategorySpendingResponse getCategorySpending(Long userId, LocalDate startDate, LocalDate endDate);
  DashboardAnalyticsResponse getCompleteDashboard(Long userId);
}
