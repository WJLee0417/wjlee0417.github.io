package com.ssafy.ssafit.airunningreport.provider;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.ssafy.ssafit.airunningreport.config.AiRunningReportProperties;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.Aggregation;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
@ConditionalOnExpression(
        "'${ai.running-report.enabled:false}' == 'true' "
                + "&& '${ai.running-report.provider:none}' == 'openai'")
public class OpenAiRunningReportProvider implements AiRunningReportLlmProvider {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final AiRunningReportProperties properties;

    @Override
    public AiRunningReportProviderResponse generate(
            Aggregation aggregation,
            String systemPrompt,
            String userPrompt) {
        validateConfiguration();
        Map<String, Object> request = Map.of(
                "model", properties.getModel(),
                "temperature", 0.2,
                "max_output_tokens", 700,
                "input", systemPrompt + "\n\n" + userPrompt);

        try {
            Map<String, Object> response = restClient()
                    .post()
                    .uri(properties.getBaseUrl() + "/responses")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(MAP_TYPE);
            return new AiRunningReportProviderResponse(
                    extractContent(response),
                    providerName(),
                    modelName());
        } catch (ResourceAccessException exception) {
            if (isTimeout(exception)) {
                throw new AiRunningReportProviderException(
                        AiRunningReportProviderFailureReason.TIMEOUT,
                        "LLM provider request timed out.");
            }
            throw new AiRunningReportProviderException(
                    AiRunningReportProviderFailureReason.API_ERROR,
                    "LLM provider transport failed.");
        } catch (RestClientException exception) {
            throw new AiRunningReportProviderException(
                    AiRunningReportProviderFailureReason.API_ERROR,
                    "LLM provider request failed.");
        }
    }

    @Override
    public String providerName() {
        return "openai";
    }

    @Override
    public String modelName() {
        return properties.getModel();
    }

    private RestClient restClient() {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();
        Duration timeout = properties.getTimeout();
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);
        return RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> response) {
        if (response == null) {
            throw invalidResponse();
        }

        Object outputText = response.get("output_text");
        if (outputText instanceof String text && StringUtils.hasText(text)) {
            return text;
        }

        Object outputValue = response.get("output");
        if (outputValue instanceof List<?> output) {
            for (Object outputItem : output) {
                if (!(outputItem instanceof Map<?, ?> outputMap)) {
                    continue;
                }
                Object contentValue = outputMap.get("content");
                if (!(contentValue instanceof List<?> contents)) {
                    continue;
                }
                for (Object contentItem : contents) {
                    if (!(contentItem instanceof Map<?, ?> contentMap)) {
                        continue;
                    }
                    Object textValue = contentMap.get("text");
                    if (textValue instanceof String text
                            && StringUtils.hasText(text)) {
                        return text;
                    }
                }
            }
        }

        throw invalidResponse();
    }

    private AiRunningReportProviderException invalidResponse() {
        return new AiRunningReportProviderException(
                AiRunningReportProviderFailureReason.INVALID_RESPONSE,
                "LLM provider returned an invalid response.");
    }

    private boolean isTimeout(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof SocketTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(properties.getApiKey())
                || !StringUtils.hasText(properties.getBaseUrl())
                || !StringUtils.hasText(properties.getModel())) {
            throw new AiRunningReportProviderException(
                    AiRunningReportProviderFailureReason.CONFIGURATION_ERROR,
                    "LLM provider is not configured.");
        }
    }
}
