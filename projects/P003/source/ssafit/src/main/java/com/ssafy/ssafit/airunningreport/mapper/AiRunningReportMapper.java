package com.ssafy.ssafit.airunningreport.mapper;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.ssafy.ssafit.airunningreport.domain.AiRunningReport;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportStatus;
import com.ssafy.ssafit.airunningreport.domain.AiRunningReportType;

@Mapper
public interface AiRunningReportMapper {

    int insert(AiRunningReport report);

    Optional<AiRunningReport> selectLatestByMemberIdAndType(
            @Param("memberId") Long memberId,
            @Param("reportType") AiRunningReportType reportType);

    Optional<AiRunningReport> selectLatestReusableBySnapshot(
            @Param("memberId") Long memberId,
            @Param("reportType") AiRunningReportType reportType,
            @Param("inputSnapshotHash") String inputSnapshotHash);

    List<AiRunningReport> selectByMemberIdTypeAndStatus(
            @Param("memberId") Long memberId,
            @Param("reportType") AiRunningReportType reportType,
            @Param("status") AiRunningReportStatus status);
}
