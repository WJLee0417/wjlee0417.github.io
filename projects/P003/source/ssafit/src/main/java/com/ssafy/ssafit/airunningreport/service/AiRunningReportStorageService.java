package com.ssafy.ssafit.airunningreport.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportStatus;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;
import com.ssafy.ssafit.airunningreport.mapper.AiRunningReportMapper;
import com.ssafy.ssafit.common.exception.CustomException;
import com.ssafy.ssafit.common.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiRunningReportStorageService {

    private final AiRunningReportMapper aiRunningReportMapper;

    @Transactional
    public AiRunningReport save(AiRunningReport report) {
        validateReport(report);
        if (aiRunningReportMapper.insert(report) != 1) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
        return report;
    }

    public Optional<AiRunningReport> getLatest(
            Long memberId,
            AiRunningReportType reportType) {
        validateMemberId(memberId);
        validateReportType(reportType);
        return aiRunningReportMapper.selectLatestByMemberIdAndType(
                memberId,
                reportType);
    }

    public Optional<AiRunningReport> findReusable(
            Long memberId,
            AiRunningReportType reportType,
            String inputSnapshotHash) {
        validateMemberId(memberId);
        validateReportType(reportType);
        if (inputSnapshotHash == null || inputSnapshotHash.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return aiRunningReportMapper.selectLatestReusableBySnapshot(
                memberId,
                reportType,
                inputSnapshotHash);
    }

    public List<AiRunningReport> getByStatus(
            Long memberId,
            AiRunningReportType reportType,
            AiRunningReportStatus status) {
        validateMemberId(memberId);
        validateReportType(reportType);
        if (status == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return aiRunningReportMapper.selectByMemberIdTypeAndStatus(
                memberId,
                reportType,
                status);
    }

    private void validateReport(AiRunningReport report) {
        if (report == null
                || report.getMemberId() == null
                || report.getReportType() == null
                || report.getInputSnapshotHash() == null
                || report.getInputSnapshotHash().isBlank()
                || report.getInputSnapshotJson() == null
                || report.getInputSnapshotJson().isBlank()
                || report.getStatus() == null
                || report.getGenerationSource() == null
                || report.getPromptVersion() == null
                || report.getPromptVersion().isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private void validateMemberId(Long memberId) {
        if (memberId == null) {
            throw new CustomException(ErrorCode.AUTH_REQUIRED);
        }
    }

    private void validateReportType(AiRunningReportType reportType) {
        if (reportType == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }
}
