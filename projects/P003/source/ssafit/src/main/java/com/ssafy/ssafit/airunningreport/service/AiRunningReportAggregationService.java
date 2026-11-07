package com.ssafy.ssafit.airunningreport.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import com.ssafy.ssafit.common.exception.CustomException;
import com.ssafy.ssafit.common.exception.ErrorCode;
import com.ssafy.ssafit.runningprofile.domain.RunningIntensity;
import com.ssafy.ssafit.runningprofile.domain.RunningProfile;
import com.ssafy.ssafit.runningprofile.mapper.RunningProfileMapper;
import com.ssafy.ssafit.runningrecord.domain.RunningRecord;
import com.ssafy.ssafit.runningrecord.mapper.RunningRecordMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiRunningReportAggregationService {

    public static final int DEFAULT_RECORD_LIMIT = 8;
    public static final int MAX_RECORD_LIMIT = 10;
    private static final int MIN_RECORDS_FOR_LIMITED_ANALYSIS = 3;
    private static final int MIN_SAMPLES_FOR_VITAL_ANALYSIS = 2;
    private static final int MIN_RECORDS_FOR_TREND = 4;
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal TREND_THRESHOLD_PERCENT = BigDecimal.valueOf(3);

    private final RunningRecordMapper runningRecordMapper;
    private final RunningProfileMapper runningProfileMapper;

    public Aggregation aggregate(Long loginMemberId) {
        return aggregate(loginMemberId, DEFAULT_RECORD_LIMIT);
    }

    public Aggregation aggregate(Long loginMemberId, Integer requestedLimit) {
        validateAuthenticated(loginMemberId);
        int limit = normalizeRecordLimit(requestedLimit);
        List<RunningRecord> records =
                safeList(runningRecordMapper.selectRecentByMemberId(
                        loginMemberId,
                        limit));
        RunningProfile profile = runningProfileMapper
                .selectByMemberId(loginMemberId)
                .orElse(null);

        RunningMetricSummary runningSummary = runningSummary(records);
        VitalMetricSummary cadenceSummary = vitalSummary(
                records,
                RunningRecord::getAverageCadence);
        VitalMetricSummary heartRateSummary = vitalSummary(
                records,
                RunningRecord::getAverageHeartRateBpm);
        IntensitySummary intensitySummary = intensitySummary(profile);
        TrendSummary trendSummary = trendSummary(records);
        DataQuality dataQuality = dataQuality(
                records,
                cadenceSummary,
                heartRateSummary);

        return new Aggregation(
                analysisStartDate(records),
                analysisEndDate(records),
                limit,
                records.size(),
                runningSummary,
                cadenceSummary,
                heartRateSummary,
                intensitySummary,
                trendSummary,
                dataQuality,
                records.stream()
                        .map(this::recentRunningRecord)
                        .toList());
    }

    private void validateAuthenticated(Long loginMemberId) {
        if (loginMemberId == null) {
            throw new CustomException(ErrorCode.AUTH_REQUIRED);
        }
    }

    private int normalizeRecordLimit(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_RECORD_LIMIT;
        }
        return Math.min(requestedLimit, MAX_RECORD_LIMIT);
    }

    private RunningMetricSummary runningSummary(List<RunningRecord> records) {
        if (records.isEmpty()) {
            return new RunningMetricSummary(
                    null,
                    null,
                    null,
                    null,
                    null,
                    DataStatus.NOT_AVAILABLE);
        }

        BigDecimal totalDistance = records.stream()
                .map(RunningRecord::getDistanceKm)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        int totalDuration = records.stream()
                .map(RunningRecord::getDurationSeconds)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        BigDecimal averageDistance = divide(
                totalDistance,
                BigDecimal.valueOf(records.size()),
                2);
        Integer averageDuration = roundedAverageSeconds(totalDuration, records.size());
        Integer averagePace = totalDistance.compareTo(BigDecimal.ZERO) > 0
                ? divide(
                        BigDecimal.valueOf(totalDuration),
                        totalDistance,
                        0).intValue()
                : null;
        DataStatus status = records.size() < MIN_RECORDS_FOR_LIMITED_ANALYSIS
                ? DataStatus.LIMITED
                : DataStatus.OK;

        return new RunningMetricSummary(
                totalDistance,
                averageDistance,
                totalDuration,
                averageDuration,
                averagePace,
                status);
    }

    private VitalMetricSummary vitalSummary(
            List<RunningRecord> records,
            Function<RunningRecord, Integer> extractor) {
        List<Integer> values = records.stream()
                .map(extractor)
                .filter(Objects::nonNull)
                .toList();
        int sampleCount = values.size();
        int missingCount = records.size() - sampleCount;
        if (sampleCount == 0) {
            return new VitalMetricSummary(
                    null,
                    null,
                    null,
                    sampleCount,
                    missingCount,
                    DataStatus.NOT_AVAILABLE);
        }

        int min = values.stream().mapToInt(Integer::intValue).min().orElseThrow();
        int max = values.stream().mapToInt(Integer::intValue).max().orElseThrow();
        double average = round(
                values.stream().mapToInt(Integer::intValue).average().orElseThrow(),
                1);
        DataStatus status;
        if (sampleCount < MIN_SAMPLES_FOR_VITAL_ANALYSIS) {
            status = DataStatus.INSUFFICIENT;
        } else if (missingCount > 0) {
            status = DataStatus.LIMITED;
        } else {
            status = DataStatus.OK;
        }

        return new VitalMetricSummary(
                average,
                min,
                max,
                sampleCount,
                missingCount,
                status);
    }

    private IntensitySummary intensitySummary(RunningProfile profile) {
        Map<RunningIntensity, Integer> distribution =
                new EnumMap<>(RunningIntensity.class);
        return new IntensitySummary(
                null,
                distribution,
                profile == null ? DataStatus.NOT_AVAILABLE : DataStatus.LIMITED);
    }

    private TrendSummary trendSummary(List<RunningRecord> records) {
        if (records.size() < MIN_RECORDS_FOR_TREND) {
            return new TrendSummary(
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
                    DataStatus.INSUFFICIENT);
        }

        int windowSize = Math.min(3, records.size() / 2);
        List<RunningRecord> latest = records.subList(0, windowSize);
        List<RunningRecord> previous = records.subList(windowSize, windowSize * 2);
        Integer latestPace = averageInteger(
                latest.stream()
                        .map(RunningRecord::getPaceSecondsPerKm)
                        .filter(Objects::nonNull)
                        .toList());
        Integer previousPace = averageInteger(
                previous.stream()
                        .map(RunningRecord::getPaceSecondsPerKm)
                        .filter(Objects::nonNull)
                        .toList());
        BigDecimal latestDistance = averageDistance(latest);
        BigDecimal previousDistance = averageDistance(previous);

        Double paceChangePercent = percentChange(previousPace, latestPace);
        Double distanceChangePercent =
                percentChange(previousDistance, latestDistance);

        return new TrendSummary(
                TrendMetric.PACE,
                paceTrend(paceChangePercent),
                paceChangePercent,
                latestPace,
                previousPace,
                distanceTrend(distanceChangePercent),
                distanceChangePercent,
                latestDistance,
                previousDistance,
                TrendBasis.RECENT_RECORDS,
                DataStatus.OK);
    }

    private DataQuality dataQuality(
            List<RunningRecord> records,
            VitalMetricSummary cadence,
            VitalMetricSummary heartRate) {
        List<String> missingItems = new ArrayList<>();
        DataStatus runningStatus;
        if (records.isEmpty()) {
            runningStatus = DataStatus.NOT_AVAILABLE;
            missingItems.add("RUNNING_RECORDS");
        } else if (records.size() < MIN_RECORDS_FOR_LIMITED_ANALYSIS) {
            runningStatus = DataStatus.LIMITED;
            missingItems.add("ENOUGH_RUNNING_RECORDS");
        } else {
            runningStatus = DataStatus.OK;
        }

        appendMissing(missingItems, "CADENCE", cadence.status());
        appendMissing(missingItems, "HEART_RATE", heartRate.status());

        DataStatus overall;
        if (runningStatus == DataStatus.NOT_AVAILABLE) {
            overall = DataStatus.INSUFFICIENT;
        } else if (missingItems.isEmpty()) {
            overall = DataStatus.OK;
        } else {
            overall = DataStatus.LIMITED;
        }

        return new DataQuality(
                overall,
                runningStatus,
                cadence.status(),
                heartRate.status(),
                missingItems);
    }

    private void appendMissing(
            List<String> missingItems,
            String key,
            DataStatus status) {
        if (status == DataStatus.NOT_AVAILABLE
                || status == DataStatus.INSUFFICIENT) {
            missingItems.add(key);
        } else if (status == DataStatus.LIMITED) {
            missingItems.add(key + "_LIMITED");
        }
    }

    private RecentRunningRecord recentRunningRecord(RunningRecord record) {
        return new RecentRunningRecord(
                record.getRecordDate(),
                record.getDistanceKm(),
                record.getDurationSeconds(),
                record.getPaceSecondsPerKm(),
                record.getAverageCadence(),
                record.getAverageHeartRateBpm());
    }

    private LocalDate analysisStartDate(List<RunningRecord> records) {
        return records.stream()
                .map(RunningRecord::getRecordDate)
                .filter(Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(null);
    }

    private LocalDate analysisEndDate(List<RunningRecord> records) {
        return records.stream()
                .map(RunningRecord::getRecordDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);
    }

    private BigDecimal averageDistance(List<RunningRecord> records) {
        if (records.isEmpty()) {
            return null;
        }
        BigDecimal total = records.stream()
                .map(RunningRecord::getDistanceKm)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return divide(total, BigDecimal.valueOf(records.size()), 2);
    }

    private Integer averageInteger(List<Integer> values) {
        if (values.isEmpty()) {
            return null;
        }
        return roundedAverageSeconds(
                values.stream().mapToInt(Integer::intValue).sum(),
                values.size());
    }

    private Integer roundedAverageSeconds(int total, int count) {
        return divide(
                BigDecimal.valueOf(total),
                BigDecimal.valueOf(count),
                0).intValue();
    }

    private Double percentChange(Integer previous, Integer latest) {
        if (previous == null || latest == null || previous <= 0) {
            return null;
        }
        return percentChange(
                BigDecimal.valueOf(previous),
                BigDecimal.valueOf(latest));
    }

    private Double percentChange(BigDecimal previous, BigDecimal latest) {
        if (previous == null
                || latest == null
                || previous.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return latest.subtract(previous)
                .divide(previous, 6, RoundingMode.HALF_UP)
                .multiply(ONE_HUNDRED)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private TrendDirection paceTrend(Double changePercent) {
        if (changePercent == null) {
            return TrendDirection.INSUFFICIENT;
        }
        BigDecimal change = BigDecimal.valueOf(changePercent);
        if (change.compareTo(TREND_THRESHOLD_PERCENT.negate()) <= 0) {
            return TrendDirection.IMPROVING;
        }
        if (change.compareTo(TREND_THRESHOLD_PERCENT) >= 0) {
            return TrendDirection.SLOWING;
        }
        return TrendDirection.STABLE;
    }

    private TrendDirection distanceTrend(Double changePercent) {
        if (changePercent == null) {
            return TrendDirection.INSUFFICIENT;
        }
        BigDecimal change = BigDecimal.valueOf(changePercent);
        if (change.compareTo(TREND_THRESHOLD_PERCENT) >= 0) {
            return TrendDirection.INCREASING;
        }
        if (change.compareTo(TREND_THRESHOLD_PERCENT.negate()) <= 0) {
            return TrendDirection.DECREASING;
        }
        return TrendDirection.STABLE;
    }

    private BigDecimal divide(
            BigDecimal dividend,
            BigDecimal divisor,
            int scale) {
        return dividend.divide(divisor, scale, RoundingMode.HALF_UP);
    }

    private double round(double value, int scale) {
        return BigDecimal.valueOf(value)
                .setScale(scale, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }
}
