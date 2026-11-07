package com.ssafy.ssafit.airunningreport.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportApiDtos.Response;

import lombok.RequiredArgsConstructor;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class AiRunningReportResponseAssembler {

    private final ObjectMapper objectMapper;

    public Response toResponse(
            AiRunningReport report,
            boolean generated,
            boolean cacheHit) {
        return Response.from(
                report,
                readTree(report.getReportContentJson()),
                missingItems(report.getInputSnapshotJson()),
                generated,
                cacheHit);
    }

    private JsonNode readTree(String json) {
        if (!StringUtils.hasText(json)) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(json);
        } catch (JacksonException exception) {
            return objectMapper.createObjectNode();
        }
    }

    private List<String> missingItems(String snapshotJson) {
        if (!StringUtils.hasText(snapshotJson)) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(snapshotJson);
            JsonNode items = root.path("dataQuality").path("missingItems");
            if (!items.isArray()) {
                return List.of();
            }
            List<String> missingItems = new ArrayList<>();
            for (JsonNode item : items) {
                if (item.isTextual() && StringUtils.hasText(item.asText())) {
                    missingItems.add(item.asText());
                }
            }
            return missingItems;
        } catch (JacksonException exception) {
            return List.of();
        }
    }
}
