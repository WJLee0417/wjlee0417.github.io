package com.ssafy.ssafit.airunningreport.controller.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportApiDtos.GenerateRequest;
import com.ssafy.ssafit.airunningreport.dto.AiRunningReportApiDtos.Response;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportGenerationService;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportGenerationService.GenerationResult;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportResponseAssembler;
import com.ssafy.ssafit.airunningreport.service.AiRunningReportStorageService;
import com.ssafy.ssafit.common.auth.SessionMemberResolver;
import com.ssafy.ssafit.common.exception.CustomException;
import com.ssafy.ssafit.common.exception.ErrorCode;
import com.ssafy.ssafit.common.response.ApiResponse;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ai/running-reports")
@RequiredArgsConstructor
public class AiRunningReportApiController {

    private final SessionMemberResolver sessionMemberResolver;
    private final AiRunningReportStorageService storageService;
    private final AiRunningReportGenerationService generationService;
    private final AiRunningReportResponseAssembler responseAssembler;

    @GetMapping("/latest")
    public ApiResponse<Response> getLatest(HttpSession session) {
        Long memberId = sessionMemberResolver.requireMemberId(session);
        AiRunningReport report = storageService
                .getLatest(memberId, AiRunningReportType.RUNNING_SUMMARY)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.AI_RUNNING_REPORT_NOT_FOUND));
        return ApiResponse.success(responseAssembler.toResponse(
                report,
                false,
                true));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Response>> generate(
            @RequestBody(required = false) GenerateRequest request,
            HttpSession session) {
        Long memberId = sessionMemberResolver.requireMemberId(session);
        boolean forceRefresh = request != null && request.isForceRefresh();
        GenerationResult result = generationService.generate(memberId, forceRefresh);
        ApiResponse<Response> response = ApiResponse.success(
                result.cacheHit()
                        ? "캐시된 AI 러닝 리포트를 반환했습니다."
                        : "AI 러닝 리포트를 생성했습니다.",
                responseAssembler.toResponse(
                        result.report(),
                        result.generated(),
                        result.cacheHit()));
        return ResponseEntity
                .status(result.cacheHit() ? HttpStatus.OK : HttpStatus.CREATED)
                .body(response);
    }
}
