package com.ssafy.ssafit.airunningreport.provider;

import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.Aggregation;

public interface AiRunningReportLlmProvider {

    AiRunningReportProviderResponse generate(
            Aggregation aggregation,
            String systemPrompt,
            String userPrompt);

    String providerName();

    String modelName();
}
