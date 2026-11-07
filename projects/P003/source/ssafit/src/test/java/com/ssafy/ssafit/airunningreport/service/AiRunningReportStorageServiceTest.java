package com.ssafy.ssafit.airunningreport.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportSource;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportStatus;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;
import com.ssafy.ssafit.airunningreport.mapper.AiRunningReportMapper;
import com.ssafy.ssafit.common.exception.CustomException;
import com.ssafy.ssafit.common.exception.ErrorCode;

@ExtendWith(MockitoExtension.class)
class AiRunningReportStorageServiceTest {

    @Mock
    private AiRunningReportMapper aiRunningReportMapper;

    private AiRunningReportStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new AiRunningReportStorageService(aiRunningReportMapper);
    }

    @Test
    void savePersistsValidReport() {
        AiRunningReport report = completedReport(10L, hash("a"));
        when(aiRunningReportMapper.insert(report)).thenAnswer(invocation -> {
            report.setId(100L);
            return 1;
        });

        AiRunningReport saved = storageService.save(report);

        assertThat(saved.getId()).isEqualTo(100L);
        verify(aiRunningReportMapper).insert(report);
    }

    @Test
    void saveRejectsInvalidReport() {
        AiRunningReport report = completedReport(10L, hash("a"));
        report.setInputSnapshotJson(null);

        assertError(ErrorCode.INVALID_REQUEST, () -> storageService.save(report));

        verify(aiRunningReportMapper, never()).insert(report);
    }

    @Test
    void getLatestDelegatesToMapper() {
        AiRunningReport report = completedReport(10L, hash("a"));
        when(aiRunningReportMapper.selectLatestByMemberIdAndType(
                10L,
                AiRunningReportType.RUNNING_SUMMARY))
                .thenReturn(Optional.of(report));

        assertThat(storageService.getLatest(
                10L,
                AiRunningReportType.RUNNING_SUMMARY))
                .contains(report);
    }

    @Test
    void findReusableRequiresSnapshotHashAndReadsCompletedReport() {
        AiRunningReport report = completedReport(10L, hash("a"));
        when(aiRunningReportMapper.selectLatestReusableBySnapshot(
                10L,
                AiRunningReportType.RUNNING_SUMMARY,
                hash("a")))
                .thenReturn(Optional.of(report));

        assertThat(storageService.findReusable(
                10L,
                AiRunningReportType.RUNNING_SUMMARY,
                hash("a")))
                .contains(report);
        assertError(
                ErrorCode.INVALID_REQUEST,
                () -> storageService.findReusable(
                        10L,
                        AiRunningReportType.RUNNING_SUMMARY,
                        " "));
    }

    @Test
    void getByStatusDelegatesToMapper() {
        AiRunningReport failed = completedReport(10L, hash("b"));
        failed.setStatus(AiRunningReportStatus.FAILED);
        when(aiRunningReportMapper.selectByMemberIdTypeAndStatus(
                10L,
                AiRunningReportType.RUNNING_SUMMARY,
                AiRunningReportStatus.FAILED))
                .thenReturn(List.of(failed));

        assertThat(storageService.getByStatus(
                10L,
                AiRunningReportType.RUNNING_SUMMARY,
                AiRunningReportStatus.FAILED))
                .containsExactly(failed);
    }

    @Test
    void missingMemberIsAuthenticationError() {
        assertError(
                ErrorCode.AUTH_REQUIRED,
                () -> storageService.getLatest(
                        null,
                        AiRunningReportType.RUNNING_SUMMARY));
    }

    private AiRunningReport completedReport(Long memberId, String hash) {
        AiRunningReport report = new AiRunningReport();
        report.setMemberId(memberId);
        report.setReportType(AiRunningReportType.RUNNING_SUMMARY);
        report.setInputSnapshotHash(hash);
        report.setInputSnapshotJson("{\"recordCount\":8}");
        report.setStatus(AiRunningReportStatus.COMPLETED);
        report.setGenerationSource(AiRunningReportSource.LLM);
        report.setProvider("openai");
        report.setModelName("test-model");
        report.setPromptVersion("v1");
        report.setReportContentJson("{\"summary\":\"ok\"}");
        return report;
    }

    private String hash(String seed) {
        return seed.repeat(64).substring(0, 64);
    }

    private void assertError(ErrorCode expected, Runnable executable) {
        assertThatThrownBy(executable::run)
                .isInstanceOfSatisfying(
                        CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(expected));
    }
}
