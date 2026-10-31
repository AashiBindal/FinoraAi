package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Request.AIChatRequest;
import com.hackathon.financecoach.dto.Response.AIChatResponse;
import com.hackathon.financecoach.dto.Response.AIInsightResponse;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.AIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

  private final AIService aiService;

  @PostMapping("/chat")
  public ResponseEntity<AIChatResponse> chatWithAI(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @Valid @RequestBody AIChatRequest request) {
    AIChatResponse response = aiService.processChat(currentUser.getId(), request.getMessage());
    return ResponseEntity.ok(response);
  }

  @GetMapping("/insights")
  public ResponseEntity<AIInsightResponse> getInsights(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    AIInsightResponse response = aiService.generateInsights(currentUser.getId());
    return ResponseEntity.ok(response);
  }
}
