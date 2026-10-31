package com.hackathon.financecoach.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "Bearer Authentication";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Personal Finance Coach – Living Money Model API")
                        .version("1.0.0")
                        .description("Backend REST API for Personal Finance Coach featuring an adaptive Living Money Model engine and Spring AI personal finance reasoning.")
                        .contact(new Contact().name("Finora AI Team").email("support@financecoach.com"))
                        .license(new License().name("Apache 2.0").url("https://springdoc.org")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME_NAME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter your JWT token obtained from /api/auth/login or /api/auth/register")))
                .tags(List.of(
                        new Tag().name("Auth").description("User Registration & Authentication"),
                        new Tag().name("Users").description("User Profile & Financial Preferences"),
                        new Tag().name("Transactions").description("Transaction Lifecycle & Category Search"),
                        new Tag().name("Finance").description("Living Money Model, Summaries & Multi-Month Trends"),
                        new Tag().name("Budgets").description("Monthly Budget Planning & Utilization Alerts"),
                        new Tag().name("Goals").description("Financial Goals & Target Tracking"),
                        new Tag().name("AI Coach").description("Grounded AI Reasoning, Chat, Insights & Forecasts"),
                        new Tag().name("Demo").description("Automated Demo Data Seeding")
                ));
    }
}
