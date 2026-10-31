package com.hackathon.financecoach.service;

import com.hackathon.financecoach.dto.Response.AIChatResponse;
import com.hackathon.financecoach.dto.Response.AIInsightResponse;

public interface AIService {
  AIChatResponse processChat(Long userId, String userMessage);
  AIInsightResponse generateInsights(Long userId);
}
