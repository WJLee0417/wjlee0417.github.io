package com.ssafy.ssafit.airunningreport.domain;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiRunningReport {

    private Long id;
    private Long memberId;
    private AiRunningReportType reportType;
    private LocalDate analysisStartDate;
    private LocalDate analysisEndDate;
    private String inputSnapshotHash;
    private String inputSnapshotJson;
    private AiRunningReportStatus status;
    private AiRunningReportSource generationSource;
    private String provider;
    private String modelName;
    private String promptVersion;
    private String reportContentJson;
    private String errorCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
