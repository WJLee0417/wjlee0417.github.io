package com.ssafy.ssafit.airunningreport.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ssafy.ssafit.airunningreport.config.AiRunningReportProperties;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportSource;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportStatus;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.Aggregation;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.DataQuality;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.DataStatus;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.IntensitySummary;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.RecentRunningRecord;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.RunningMetricSummary;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.TrendBasis;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.TrendDirection;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.TrendMetric;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.TrendSummary;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportAggregationDtos.VitalMetricSummary;
import com.ssafy.ssafit.airunningreport.provider.AiRunningReportLlmProvider;
import com.ssafy.ssafit.airunningreport.provider.AiRunningReportProviderException;
import com.ssafy.ssafit.airunningreport.provider.AiRunningReportProviderFailureReason;
import com.ssafy.ssafit.airunningreport.provider.AiRunningReportProviderResponse;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportGenerationService.GenerationResult;
import com.ssafy.ssafit.runningprofile.domain.RunningIntensity;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AiRunningReportGenerationServiceTest {

    @Mock
    private AiRunningReportAggregationService aggregationService;

    @Mock
    private AiRunningReportStorageService storageService;

    private ObjectMapper objectMapper;
    private AiRunningReportProperties properties;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        properties = new AiRunningReportProperties();
        properties.setPromptVersion("test-prompt-v1");
    }

    @Test
    void generateSavesNormalJsonResponseAsLlmReport() throws Exception {
        FakeProvider provider = FakeProvider.success("""
                {
                  "runningPatternSummary": "최근 러닝이 안정적으로 이어졌습니다.",
                  "paceAndIntensityInsight": "평균 페이스를 기준으로 강도는 무리 없는 편입니다.",
                  "cadenceAndHeartRateInsight": "케이던스와 심박은 참고용으로만 해석했습니다.",
                  "nextRunningGoal": "다음 러닝도 비슷한 강도로 이어가세요.",
                  "dataLimitations": "제공된 집계 데이터만 사용했습니다."
                }
                """);
        AiRunningReportGenerationService service = serviceWith(provider);
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        GenerationResult result = service.generate(10L);
        AiRunningReport report = result.report();

        assertThat(result.generated()).isTrue();
        assertThat(result.cacheHit()).isFalse();
        assertThat(report.getGenerationSource()).isEqualTo(AiRunningReportSource.LLM);
        assertThat(report.getStatus()).isEqualTo(AiRunningReportStatus.COMPLETED);
        assertThat(report.getProvider()).isEqualTo("fake");
        assertThat(report.getModelName()).isEqualTo("fake-model");
        assertThat(report.getPromptVersion()).isEqualTo("test-prompt-v1");
        JsonNode content = objectMapper.readTree(report.getReportContentJson());
        assertThat(content.get("runningPatternSummary").asText())
                .contains("안정적으로");
        assertThat(provider.userPrompt).doesNotContain("memberId", "email", "nickname");
    }

    @Test
    void generateFillsMissingJsonFieldsWithoutChangingLlmSource() throws Exception {
        AiRunningReportGenerationService service = serviceWith(FakeProvider.success("""
                {
                  "runningPatternSummary": "최근 기록을 기준으로 요약했습니다."
                }
                """));
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AiRunningReport report = service.generate(10L).report();

        assertThat(report.getGenerationSource()).isEqualTo(AiRunningReportSource.LLM);
        JsonNode content = objectMapper.readTree(report.getReportContentJson());
        assertThat(content.get("runningPatternSummary").asText())
                .contains("최근 기록");
        assertThat(content.get("paceAndIntensityInsight").asText()).isNotBlank();
        assertThat(content.get("dataLimitations").asText()).isNotBlank();
    }

    @Test
    void generateUsesFallbackWhenJsonIsMalformed() throws Exception {
        AiRunningReportGenerationService service =
                serviceWith(FakeProvider.success("not-json"));
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AiRunningReport report = service.generate(10L).report();

        assertFallbackReport(report);
    }

    @Test
    void generateUsesFallbackOnTimeout() {
        AiRunningReportGenerationService service =
                serviceWith(FakeProvider.failure(
                        AiRunningReportProviderFailureReason.TIMEOUT));
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AiRunningReport report = service.generate(10L).report();

        assertFallbackReport(report);
    }

    @Test
    void generateUsesFallbackOnApiError() {
        AiRunningReportGenerationService service =
                serviceWith(FakeProvider.failure(
                        AiRunningReportProviderFailureReason.API_ERROR));
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AiRunningReport report = service.generate(10L).report();

        assertFallbackReport(report);
    }

    @Test
    void generateSkipsProviderAndSavesFallbackForInsufficientData() {
        FakeProvider provider = FakeProvider.success("""
                {"runningPatternSummary":"should not be used"}
                """);
        AiRunningReportGenerationService service = serviceWith(provider);
        when(aggregationService.aggregate(10L)).thenReturn(insufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AiRunningReport report = service.generate(10L).report();

        assertFallbackReport(report);
        assertThat(provider.called).isFalse();
    }

    @Test
    void generateSavesFallbackWhenProviderIsNotConfigured() {
        AiRunningReportGenerationService service = serviceWith();
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AiRunningReport report = service.generate(10L).report();

        assertFallbackReport(report);
    }

    @Test
    void generateReusesCompletedReportForSameSnapshot() {
        AiRunningReport reusable = new AiRunningReport();
        reusable.setId(99L);
        AiRunningReportGenerationService service =
                serviceWith(FakeProvider.success("{}"));
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.of(reusable));

        GenerationResult result = service.generate(10L);
        AiRunningReport report = result.report();

        assertThat(report).isSameAs(reusable);
        assertThat(result.generated()).isFalse();
        assertThat(result.cacheHit()).isTrue();
        verify(storageService, never()).save(any());
    }

    @Test
    void generateStoresSnapshotWithoutPersonalIdentifiers() {
        AiRunningReportGenerationService service =
                serviceWith(FakeProvider.success("{}"));
        when(aggregationService.aggregate(10L)).thenReturn(sufficientAggregation());
        when(storageService.findReusable(
                eq(10L),
                eq(AiRunningReportType.RUNNING_SUMMARY),
                anyString()))
                .thenReturn(Optional.empty());
        when(storageService.save(any(AiRunningReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.generate(10L);

        ArgumentCaptor<AiRunningReport> captor =
                ArgumentCaptor.forClass(AiRunningReport.class);
        verify(storageService).save(captor.capture());
        assertThat(captor.getValue().getInputSnapshotJson())
                .doesNotContain("memberId", "email", "nickname");
        assertThat(captor.getValue().getInputSnapshotHash()).hasSize(64);
    }

    private AiRunningReportGenerationService serviceWith(
            AiRunningReportLlmProvider... providers) {
        return new AiRunningReportGenerationService(
                aggregationService,
                storageService,
                properties,
                objectMapper,
                List.of(providers));
    }

    private Aggregation sufficientAggregation() {
        return new Aggregation(
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 24),
                8,
                5,
                new RunningMetricSummary(
                        new BigDecimal("25.00"),
                        new BigDecimal("5.00"),
                        9000,
                        1800,
                        360,
                        DataStatus.OK),
                new VitalMetricSummary(172.4, 168, 178, 5, 0, DataStatus.OK),
                new VitalMetricSummary(154.2, 148, 160, 5, 0, DataStatus.OK),
                new IntensitySummary(
                        RunningIntensity.MODERATE,
                        Map.of(RunningIntensity.MODERATE, 3),
                        DataStatus.OK),
                new TrendSummary(
                        TrendMetric.PACE,
                        TrendDirection.STABLE,
                        1.2,
                        358,
                        362,
                        TrendDirection.INCREASING,
                        4.0,
                        new BigDecimal("5.20"),
                        new BigDecimal("5.00"),
                        TrendBasis.RECENT_RECORDS,
                        DataStatus.OK),
                new DataQuality(
                        DataStatus.OK,
                        DataStatus.OK,
                        DataStatus.OK,
                        DataStatus.OK,
                        List.of()),
                List.of(new RecentRunningRecord(
                        LocalDate.of(2026, 6, 24),
                        new BigDecimal("5.00"),
                        1800,
                        360,
                        172,
                        154)));
    }

    private Aggregation insufficientAggregation() {
        return new Aggregation(
                null,
                null,
                8,
                0,
                new RunningMetricSummary(
                        null,
                        null,
                        null,
                        null,
                        null,
                        DataStatus.NOT_AVAILABLE),
                new VitalMetricSummary(
                        null,
                        null,
                        null,
                        0,
                        0,
                        DataStatus.NOT_AVAILABLE),
                new VitalMetricSummary(
                        null,
                        null,
                        null,
                        0,
                        0,
                        DataStatus.NOT_AVAILABLE),
                new IntensitySummary(null, Map.of(), DataStatus.NOT_AVAILABLE),
                new TrendSummary(
                        TrendMetric.PACE,
                        TrendDirection.INSUFFICIENT,
                        null,
                        null,
                        null,
                        TrendDirection.INSUFFICIENT,
                        null,
                        null,
                        null,
                        TrendBasis.NOT_ENOUGH_DATA,
                        DataStatus.INSUFFICIENT),
                new DataQuality(
                        DataStatus.INSUFFICIENT,
                        DataStatus.NOT_AVAILABLE,
                        DataStatus.NOT_AVAILABLE,
                        DataStatus.NOT_AVAILABLE,
                        List.of("RUNNING_RECORDS")),
                List.of());
    }

    private void assertFallbackReport(AiRunningReport report) {
        assertThat(report.getGenerationSource()).isEqualTo(AiRunningReportSource.FALLBACK);
        assertThat(report.getStatus()).isEqualTo(AiRunningReportStatus.COMPLETED);
        assertThat(report.getProvider()).isNull();
        assertThat(report.getModelName()).isNull();
        assertThat(report.getReportContentJson()).contains("dataLimitations");
    }

    private static final class FakeProvider implements AiRunningReportLlmProvider {

        private final String contentJson;
        private final AiRunningReportProviderFailureReason failureReason;
        private boolean called;
        private String userPrompt;

        private FakeProvider(
                String contentJson,
                AiRunningReportProviderFailureReason failureReason) {
            this.contentJson = contentJson;
            this.failureReason = failureReason;
        }

        static FakeProvider success(String contentJson) {
            return new FakeProvider(contentJson, null);
        }

        static FakeProvider failure(
                AiRunningReportProviderFailureReason failureReason) {
            return new FakeProvider(null, failureReason);
        }

        @Override
        public AiRunningReportProviderResponse generate(
                Aggregation aggregation,
                String systemPrompt,
                String userPrompt) {
            called = true;
            this.userPrompt = userPrompt;
            if (failureReason != null) {
                throw new AiRunningReportProviderException(
                        failureReason,
                        "fake failure");
            }
            return new AiRunningReportProviderResponse(
                    contentJson,
                    providerName(),
                    modelName());
        }

        @Override
        public String providerName() {
            return "fake";
        }

        @Override
        public String modelName() {
            return "fake-model";
        }
    }
}
