package com.hackathon.financecoach.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SpringAIConfiguration {

  @Bean
  public ChatClient financeChatClient(AIConfig aiConfig) {

    // Without a key the app must still start: AIServiceImpl checks AIConfig and returns an
    // explicit "AI not configured" answer instead of calling the model.
    String apiKey = (aiConfig.getApiKey() == null || aiConfig.getApiKey().isBlank())
      ? "not-configured"
      : aiConfig.getApiKey();

    OpenAiApi openAiApi = OpenAiApi.builder()
      .baseUrl(aiConfig.getBaseUrl())
      .apiKey(apiKey)
      .build();

    OpenAiChatModel chatModel = OpenAiChatModel.builder()
      .openAiApi(openAiApi)
      .defaultOptions(
        OpenAiChatOptions.builder()
          .model(aiConfig.getModel())
          .temperature(0.7)
          .build()
      )
      .build();

    return ChatClient.builder(chatModel).build();
  }
}
