package com.hackathon.financecoach.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIChatRequest {

  @NotBlank(message = "Message prompt cannot be blank")
  @Size(max = 1000, message = "Prompt cannot exceed 1000 characters")
  private String message;
}
