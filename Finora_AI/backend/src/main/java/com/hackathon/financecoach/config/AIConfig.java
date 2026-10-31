package com.hackathon.financecoach.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Getter
@Configuration
public class AIConfig {

  @Value("${ai.enabled:false}")
  private boolean enabled;

  @Value("${ai.api-key:}")
  private String apiKey;

  @Value("${ai.model:openai/gpt-oss-120b}")
  private String model;

  @Value("${ai.base-url:https://api.groq.com/openai}")
  private String baseUrl;
}
