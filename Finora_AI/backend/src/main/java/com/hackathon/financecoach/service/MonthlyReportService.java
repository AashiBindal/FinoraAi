package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Response.MonthlyReportResponse;

public interface MonthlyReportService {
  MonthlyReportResponse generateMonthlyReport(Long userId, int year, int month);
}
