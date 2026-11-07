package com.ssafy.ssafit.airunningreport.provider;

public record AiRunningReportProviderResponse(
        String contentJson,
        String providerName,
        String modelName) {
}
