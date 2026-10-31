package com.hackathon.financecoach.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Single CORS configuration, used by Spring Security (see SecurityConfig).
 * Allowed origins come from CORS_ORIGINS (comma-separated; patterns such as https://*.trycloudflare.com allowed).
 * Default: the Vite dev server.
 */
@Configuration
public class CorsConfig {

  @Value("${app.cors-origins:http://localhost:5173}")
  private String corsOrigins;

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    List<String> origins = Arrays.stream(corsOrigins.split(","))
      .map(String::trim)
      .filter(s -> !s.isEmpty())
      .toList();

    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOriginPatterns(origins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setExposedHeaders(List.of("Authorization"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
