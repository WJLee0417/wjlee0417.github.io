package com.ssafy.ssafit.airunningreport.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.ssafy.ssafit.airunningreport.config.AiRunningReportProperties;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportSource;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportStatus;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.Aggregation;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.DataStatus;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportContentDtos.ReportContent;
import com.ssafy.ssafit.airunningreport.provider.AiRunningReportLlmProvider;
import com.ssafy.ssafit.airunningreport.provider.AiRunningReportProviderException;
import com.ssafy.ssafit.airunningreport.provider.AiRunningReportProviderResponse;
import com.ssafy.ssafit.common.exception.CustomException;
import com.ssafy.ssafit.common.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class AiRunningReportGenerationService {

    private static final AiRunningReportType REPORT_TYPE =
            AiRunningReportType.RUNNING_SUMMARY;
    private static final String SYSTEM_PROMPT = """
            당신은 러닝 데이터를 해석하는 한국어 리포트 작성자입니다.
            제공받은 JSON 데이터 이외의 사실, 거리, 페이스, 심박, 케이던스 수치를 만들거나 재계산하지 마세요.
            심박 데이터는 건강 상태, 질병, 부상, 치료, 의학적 조언으로 해석하지 마세요.
            데이터가 부족하면 부족하다고 명시하세요.
            음악 방향은 BPM 범위, 강도, 장르 선호가 존재할 때만 제안하세요.
            운동 목표는 무리한 수치 목표가 아니라 현실적인 다음 러닝 방향으로 작성하세요.
            응답은 한국어 JSON 객체만 반환하고 JSON 외 텍스트는 반환하지 마세요.
            JSON 필드는 runningPatternSummary, paceAndIntensityInsight,
            cadenceAndHeartRateInsight, nextRunningGoal, dataLimitations만 사용하세요.
            각 필드는 화면에 바로 표시할 수 있도록 1~2문장으로 짧게 작성하세요.
            """;

    private final AiRunningReportAggregationService aggregationService;
    private final AiRunningReportStorageService storageService;
    private final AiRunningReportProperties properties;
    private final ObjectMapper objectMapper;
    private final List<AiRunningReportLlmProvider> providers;
    private final Map<Long, Object> memberLocks = new ConcurrentHashMap<>();

    public GenerationResult generate(Long loginMemberId) {
        return generate(loginMemberId, false);
    }

    public GenerationResult generate(Long loginMemberId, boolean forceRefresh) {
        validateAuthenticated(loginMemberId);
        Object lock = memberLocks.computeIfAbsent(loginMemberId, ignored -> new Object());
        try {
            synchronized (lock) {
                return generateLocked(loginMemberId, forceRefresh);
            }
        } finally {
            memberLocks.remove(loginMemberId, lock);
        }
    }

    private GenerationResult generateLocked(Long loginMemberId, boolean forceRefresh) {
        Aggregation aggregation = aggregationService.aggregate(loginMemberId);
        String snapshotJson = writeSnapshotJson(aggregation);
        String snapshotHash = sha256(snapshotJson);

        if (!forceRefresh) {
            Optional<AiRunningReport> reusable = storageService.findReusable(
                    loginMemberId,
                    REPORT_TYPE,
                    snapshotHash);
            if (reusable.isPresent()) {
                return new GenerationResult(reusable.get(), false, true);
            }
        }

        if (aggregation.dataQuality().overallStatus() == DataStatus.INSUFFICIENT) {
            return new GenerationResult(
                    saveFallback(loginMemberId, aggregation, snapshotJson, snapshotHash),
                    true,
                    false);
        }

        AiRunningReportLlmProvider provider = selectProvider().orElse(null);
        if (provider == null) {
            return new GenerationResult(
                    saveFallback(loginMemberId, aggregation, snapshotJson, snapshotHash),
                    true,
                    false);
        }

        try {
            AiRunningReportProviderResponse response = provider.generate(
                    aggregation,
                    SYSTEM_PROMPT,
                    userPrompt(snapshotJson));
            ReportContent content = normalizeContent(
                    parseContent(response.contentJson()),
                    aggregation);
            return new GenerationResult(
                    saveCompleted(
                            loginMemberId,
                            aggregation,
                            snapshotJson,
                            snapshotHash,
                            AiRunningReportSource.LLM,
                            response.providerName(),
                            response.modelName(),
                            writeContentJson(content)),
                    true,
                    false);
        } catch (AiRunningReportProviderException | JacksonException exception) {
            return new GenerationResult(
                    saveFallback(loginMemberId, aggregation, snapshotJson, snapshotHash),
                    true,
                    false);
        }
    }

    private Optional<AiRunningReportLlmProvider> selectProvider() {
        return providers.stream().findFirst();
    }

    private String userPrompt(String snapshotJson) {
        return """
                아래 집계 JSON은 서버가 계산한 확정 통계입니다.
                수치를 새로 계산하지 말고, 값이 null이거나 status가 NOT_AVAILABLE,
                INSUFFICIENT, LIMITED인 항목은 데이터 한계로 설명하세요.

                집계 JSON:
                """
                + snapshotJson;
    }

    private ReportContent parseContent(String contentJson)
            throws JacksonException {
        return objectMapper.readValue(contentJson, ReportContent.class);
    }

    private ReportContent normalizeContent(
            ReportContent content,
            Aggregation aggregation) {
        ReportContent fallback = fallbackContent(aggregation);
        if (content == null) {
            return fallback;
        }
        return new ReportContent(
                normalizeField(
                        content.runningPatternSummary(),
                        fallback.runningPatternSummary()),
                normalizeField(
                        content.paceAndIntensityInsight(),
                        fallback.paceAndIntensityInsight()),
                normalizeField(
                        content.cadenceAndHeartRateInsight(),
                        fallback.cadenceAndHeartRateInsight()),
                normalizeField(
                        content.nextRunningGoal(),
                        fallback.nextRunningGoal()),
                normalizeField(
                        content.dataLimitations(),
                        fallback.dataLimitations()));
    }

    private String normalizeField(String value, String fallback) {
        String selected = StringUtils.hasText(value) ? value.trim() : fallback;
        int perFieldLimit = Math.max(
                80,
                Math.min(400, properties.getMaxOutputCharacters() / 5));
        if (selected.length() <= perFieldLimit) {
            return selected;
        }
        return selected.substring(0, perFieldLimit - 1).trim() + "...";
    }

    private AiRunningReport saveFallback(
            Long memberId,
            Aggregation aggregation,
            String snapshotJson,
            String snapshotHash) {
        return saveCompleted(
                memberId,
                aggregation,
                snapshotJson,
                snapshotHash,
                AiRunningReportSource.FALLBACK,
                null,
                null,
                writeContentJson(fallbackContent(aggregation)));
    }

    private AiRunningReport saveCompleted(
            Long memberId,
            Aggregation aggregation,
            String snapshotJson,
            String snapshotHash,
            AiRunningReportSource source,
            String provider,
            String model,
            String reportContentJson) {
        AiRunningReport report = new AiRunningReport();
        report.setMemberId(memberId);
        report.setReportType(REPORT_TYPE);
        report.setAnalysisStartDate(aggregation.analysisStartDate());
        report.setAnalysisEndDate(aggregation.analysisEndDate());
        report.setInputSnapshotHash(snapshotHash);
        report.setInputSnapshotJson(snapshotJson);
        report.setStatus(AiRunningReportStatus.COMPLETED);
        report.setGenerationSource(source);
        report.setProvider(provider);
        report.setModelName(model);
        report.setPromptVersion(properties.getPromptVersion());
        report.setReportContentJson(reportContentJson);
        return storageService.save(report);
    }

    private ReportContent fallbackContent(Aggregation aggregation) {
        boolean hasRunningRecords = aggregation.runningRecordCount() != null
                && aggregation.runningRecordCount() > 0;
        String runningPattern = hasRunningRecords
                ? "최근 러닝 기록을 기준으로 거리, 시간, 페이스 흐름을 요약했습니다."
                : "최근 러닝 기록이 없어 러닝 패턴을 판단하기에는 데이터가 부족합니다.";
        String paceInsight = hasRunningRecords
                ? "서버가 계산한 평균 페이스와 강도 분포를 기준으로 무리 없는 흐름을 유지하는 방향이 좋습니다."
                : "페이스와 강도 변화는 러닝 기록이 쌓인 뒤 다시 확인할 수 있습니다.";
        String vitalInsight = vitalFallback(aggregation);
        String nextGoal = hasRunningRecords
                ? "다음 러닝은 최근 평균 흐름을 크게 벗어나지 않는 편안한 지속주로 이어가세요."
                : "먼저 짧고 편안한 러닝 기록을 1~2회 남겨 리포트 기준 데이터를 만드는 것이 좋습니다.";
        String limitations = aggregation.dataQuality().missingItems().isEmpty()
                ? "현재 리포트는 서버 집계 데이터만 바탕으로 작성되었습니다."
                : "데이터가 부족한 항목: "
                        + String.join(", ", aggregation.dataQuality().missingItems());
        return new ReportContent(
                runningPattern,
                paceInsight,
                vitalInsight,
                nextGoal,
                limitations);
    }

    private String vitalFallback(Aggregation aggregation) {
        boolean hasCadence = aggregation.cadence().status() == DataStatus.OK
                || aggregation.cadence().status() == DataStatus.LIMITED;
        boolean hasHeartRate = aggregation.heartRate().status() == DataStatus.OK
                || aggregation.heartRate().status() == DataStatus.LIMITED;
        if (hasCadence && hasHeartRate) {
            return "케이던스와 심박은 제공된 평균 또는 범위만 참고했으며 건강 상태 판단에는 사용하지 않았습니다.";
        }
        if (hasCadence) {
            return "케이던스 데이터는 참고할 수 있지만 심박 데이터는 부족해 함께 해석하지 않았습니다.";
        }
        if (hasHeartRate) {
            return "심박 데이터는 건강 판단이 아닌 운동 흐름 참고용으로만 보며 케이던스 데이터는 부족합니다.";
        }
        return "케이던스와 심박 데이터가 부족해 해당 항목은 해석하지 않았습니다.";
    }

    private String writeSnapshotJson(Aggregation aggregation) {
        try {
            return objectMapper.writeValueAsString(aggregation);
        } catch (JacksonException exception) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private String writeContentJson(ReportContent content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JacksonException exception) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private void validateAuthenticated(Long memberId) {
        if (memberId == null) {
            throw new CustomException(ErrorCode.AUTH_REQUIRED);
        }
    }

    public record GenerationResult(
            AiRunningReport report,
            boolean generated,
            boolean cacheHit) {
    }
}
