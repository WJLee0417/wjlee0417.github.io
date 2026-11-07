package com.ssafy.ssafit.airunningreport.controller.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportSource;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportStatus;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportGenerationService;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportGenerationService.GenerationResult;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportResponseAssembler;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportStorageService;
import com.ssafy.ssafit.common.auth.SessionConst;
import com.ssafy.ssafit.common.auth.SessionMemberResolver;
import com.ssafy.ssafit.common.exception.CustomException;
import com.ssafy.ssafit.common.exception.ErrorCode;
import com.ssafy.ssafit.common.exception.GlobalExceptionHandler;

import jakarta.servlet.http.HttpSession;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AiRunningReportApiControllerTest {

    @Mock
    private SessionMemberResolver sessionMemberResolver;

    @Mock
    private AiRunningReportStorageService storageService;

    @Mock
    private AiRunningReportGenerationService generationService;

    private MockMvc mockMvc;
    private MockHttpSession session;

    @BeforeEach
    void setUp() {
        AiRunningReportResponseAssembler responseAssembler =
                new AiRunningReportResponseAssembler(new ObjectMapper());
        mockMvc = MockMvcBuilders
                .standaloneSetup(new AiRunningReportApiController(
                        sessionMemberResolver,
                        storageService,
                        generationService,
                        responseAssembler))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        session = new MockHttpSession();
        session.setAttribute(SessionConst.LOGIN_MEMBER_ID, 10L);
    }

    @Test
    void latestReturnsAuthenticatedMembersLatestReport() throws Exception {
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenReturn(10L);
        when(storageService.getLatest(10L, AiRunningReportType.RUNNING_SUMMARY))
                .thenReturn(Optional.of(report(10L, AiRunningReportSource.LLM)));

        mockMvc.perform(get("/api/ai/running-reports/latest")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(100))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.generationSource").value("LLM"))
                .andExpect(jsonPath("$.data.analysisStartDate").value("2026-06-01"))
                .andExpect(jsonPath("$.data.analysisEndDate").value("2026-06-24"))
                .andExpect(jsonPath("$.data.reportContent.runningPatternSummary")
                        .value("최근 러닝 요약"))
                .andExpect(jsonPath("$.data.missingItems[0]").value("HEART_RATE"))
                .andExpect(jsonPath("$.data.dataInsufficient").value(true))
                .andExpect(jsonPath("$.data.generated").value(false))
                .andExpect(jsonPath("$.data.cacheHit").value(true))
                .andExpect(jsonPath("$.data.memberId").doesNotExist())
                .andExpect(jsonPath("$.data.inputSnapshotHash").doesNotExist());
    }

    @Test
    void unauthenticatedLatestUsesGlobalErrorContract() throws Exception {
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenThrow(new CustomException(ErrorCode.AUTH_REQUIRED));

        mockMvc.perform(get("/api/ai/running-reports/latest"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void missingLatestReportIsNotFoundForCurrentMemberOnly() throws Exception {
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenReturn(10L);
        when(storageService.getLatest(10L, AiRunningReportType.RUNNING_SUMMARY))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/ai/running-reports/latest")
                        .session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AI_RUNNING_REPORT_NOT_FOUND"));

        verify(storageService).getLatest(10L, AiRunningReportType.RUNNING_SUMMARY);
        verify(storageService, never())
                .getLatest(eq(20L), any(AiRunningReportType.class));
    }

    @Test
    void generateCreatesReportForAuthenticatedMember() throws Exception {
        AiRunningReport report = report(10L, AiRunningReportSource.LLM);
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenReturn(10L);
        when(generationService.generate(10L, false))
                .thenReturn(new GenerationResult(report, true, false));

        mockMvc.perform(post("/api/ai/running-reports")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.generated").value(true))
                .andExpect(jsonPath("$.data.cacheHit").value(false))
                .andExpect(jsonPath("$.data.generationSource").value("LLM"));
    }

    @Test
    void generateCanReuseCachedReport() throws Exception {
        AiRunningReport report = report(10L, AiRunningReportSource.LLM);
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenReturn(10L);
        when(generationService.generate(10L, false))
                .thenReturn(new GenerationResult(report, false, true));

        mockMvc.perform(post("/api/ai/running-reports")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.generated").value(false))
                .andExpect(jsonPath("$.data.cacheHit").value(true));
    }

    @Test
    void forceRefreshOptionIsDelegatedToGenerationService() throws Exception {
        AiRunningReport report = report(10L, AiRunningReportSource.LLM);
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenReturn(10L);
        when(generationService.generate(10L, true))
                .thenReturn(new GenerationResult(report, true, false));

        mockMvc.perform(post("/api/ai/running-reports")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"forceRefresh\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.generated").value(true));

        verify(generationService).generate(10L, true);
    }

    @Test
    void generationWithNoRunningDataReturnsFallbackReport() throws Exception {
        AiRunningReport report = report(10L, AiRunningReportSource.FALLBACK);
        report.setAnalysisStartDate(null);
        report.setAnalysisEndDate(null);
        report.setInputSnapshotJson("""
                {"dataQuality":{"missingItems":["RUNNING_RECORDS"]}}
                """);
        report.setReportContentJson("""
                {"runningPatternSummary":"최근 러닝 기록이 없어 데이터가 부족합니다."}
                """);
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenReturn(10L);
        when(generationService.generate(10L, false))
                .thenReturn(new GenerationResult(report, true, false));

        mockMvc.perform(post("/api/ai/running-reports")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.generationSource").value("FALLBACK"))
                .andExpect(jsonPath("$.data.missingItems[0]").value("RUNNING_RECORDS"))
                .andExpect(jsonPath("$.data.dataInsufficient").value(true));
    }

    @Test
    void llmFailureReturnsSavedFallbackReport() throws Exception {
        AiRunningReport report = report(10L, AiRunningReportSource.FALLBACK);
        when(sessionMemberResolver.requireMemberId(any(HttpSession.class)))
                .thenReturn(10L);
        when(generationService.generate(10L, false))
                .thenReturn(new GenerationResult(report, true, false));

        mockMvc.perform(post("/api/ai/running-reports")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.generationSource").value("FALLBACK"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    private AiRunningReport report(Long memberId, AiRunningReportSource source) {
        AiRunningReport report = new AiRunningReport();
        report.setId(100L);
        report.setMemberId(memberId);
        report.setReportType(AiRunningReportType.RUNNING_SUMMARY);
        report.setAnalysisStartDate(LocalDate.of(2026, 6, 1));
        report.setAnalysisEndDate(LocalDate.of(2026, 6, 24));
        report.setInputSnapshotHash("a".repeat(64));
        report.setInputSnapshotJson("""
                {"dataQuality":{"missingItems":["HEART_RATE"]}}
                """);
        report.setStatus(AiRunningReportStatus.COMPLETED);
        report.setGenerationSource(source);
        report.setPromptVersion("test-v1");
        report.setReportContentJson("""
                {"runningPatternSummary":"최근 러닝 요약"}
                """);
        report.setCreatedAt(LocalDateTime.of(2026, 6, 24, 13, 0));
        return report;
    }
}
