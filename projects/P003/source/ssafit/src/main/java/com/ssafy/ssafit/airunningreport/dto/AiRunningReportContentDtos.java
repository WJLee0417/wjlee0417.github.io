package com.ssafy.ssafit.airunningreport.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public final class AiRunningReportContentDtos {

    private AiRunningReportContentDtos() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReportContent(
            String runningPatternSummary,
            String paceAndIntensityInsight,
            String cadenceAndHeartRateInsight,
            String nextRunningGoal,
            String dataLimitations) {
    }
}
