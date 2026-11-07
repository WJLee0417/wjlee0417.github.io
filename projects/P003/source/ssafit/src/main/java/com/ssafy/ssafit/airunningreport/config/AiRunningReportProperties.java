package com.ssafy.ssafit.airunningreport.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "ai.running-report")
public class AiRunningReportProperties {

    private boolean enabled = false;
    private String provider = "none";
    private String apiKey;
    private String baseUrl = "https://api.openai.com/v1";
    private String model = "gpt-4.1-mini";
    private Duration timeout = Duration.ofSeconds(10);
    private String promptVersion = "ai-running-report-v1";
    private int maxOutputCharacters = 1_200;
}
