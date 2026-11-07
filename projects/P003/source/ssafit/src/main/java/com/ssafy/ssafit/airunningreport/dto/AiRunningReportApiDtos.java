package com.ssafy.ssafit.airunningreport.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportSource;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportStatus;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;

import tools.jackson.databind.JsonNode;

public final class AiRunningReportApiDtos {

    private AiRunningReportApiDtos() {
    }

    public record GenerateRequest(Boolean forceRefresh) {

        public boolean isForceRefresh() {
            return Boolean.TRUE.equals(forceRefresh);
        }
    }

    public record Response(
            Long id,
            AiRunningReportType reportType,
            AiRunningReportStatus status,
            AiRunningReportSource generationSource,
            LocalDate analysisStartDate,
            LocalDate analysisEndDate,
            LocalDateTime createdAt,
            JsonNode reportContent,
            boolean dataInsufficient,
            List<String> missingItems,
            boolean generated,
            boolean cacheHit) {

        public static Response from(
                AiRunningReport report,
                JsonNode reportContent,
                List<String> missingItems,
                boolean generated,
                boolean cacheHit) {
            return new Response(
                    report.getId(),
                    report.getReportType(),
                    report.getStatus(),
                    report.getGenerationSource(),
                    report.getAnalysisStartDate(),
                    report.getAnalysisEndDate(),
                    report.getCreatedAt(),
                    reportContent,
                    !missingItems.isEmpty(),
                    List.copyOf(missingItems),
                    generated,
                    cacheHit);
        }
    }
}
