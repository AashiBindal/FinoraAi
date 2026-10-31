package com.hackathon.financecoach.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {

  private String reply;
  private String source;
  private String model;
  private OffsetDateTime generatedAt;
  private String dataUsed;
  private String notice;
  private List<String> suggestedFollowUps;
  private String disclaimer;
}
