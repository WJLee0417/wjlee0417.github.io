package com.ssafy.ssafit.airunningreport.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.ssafy.ssafit.playlist.domain.SpotifyExportStatus;
import com.ssafy.ssafit.runningprofile.domain.RunningIntensity;

public final class AiRunningReportAggregationDtos {

    private AiRunningReportAggregationDtos() {
    }

    public enum DataStatus {
        OK,
        LIMITED,
        INSUFFICIENT,
        NOT_AVAILABLE
    }

    public enum TrendDirection {
        IMPROVING,
        SLOWING,
        INCREASING,
        DECREASING,
        STABLE,
        INSUFFICIENT
    }

    public enum TrendMetric {
        PACE,
        DISTANCE
    }

    public enum TrendBasis {
        RECENT_RECORDS,
        NOT_ENOUGH_DATA
    }

    public enum RecommendationBasis {
        RECENT_LOGS,
        RUNNING_PROFILE,
        NOT_AVAILABLE
    }

    public record Aggregation(
            LocalDate analysisStartDate,
            LocalDate analysisEndDate,
            Integer requestedRecordLimit,
            Integer runningRecordCount,
            RunningMetricSummary running,
            VitalMetricSummary cadence,
            VitalMetricSummary heartRate,
            IntensitySummary intensity,
            TrendSummary trend,
            DataQuality dataQuality,
            List<RecentRunningRecord> recentRecords) {

        public Aggregation {
            recentRecords = recentRecords == null
                    ? List.of()
                    : List.copyOf(recentRecords);
        }
    }

    public record RunningMetricSummary(
            BigDecimal totalDistanceKm,
            BigDecimal averageDistanceKm,
            Integer totalDurationSeconds,
            Integer averageDurationSeconds,
            Integer averagePaceSecondsPerKm,
            DataStatus status) {
    }

    public record VitalMetricSummary(
            Double average,
            Integer min,
            Integer max,
            Integer sampleCount,
            Integer missingCount,
            DataStatus status) {
    }

    public record IntensitySummary(
            RunningIntensity currentProfileIntensity,
            Map<RunningIntensity, Integer> recentRecommendationDistribution,
            DataStatus status) {

        public IntensitySummary {
            recentRecommendationDistribution =
                    recentRecommendationDistribution == null
                            ? Map.of()
                            : Map.copyOf(recentRecommendationDistribution);
        }
    }

    public record TrendSummary(
            TrendMetric primaryMetric,
            TrendDirection paceDirection,
            Double paceChangePercent,
            Integer recentAveragePaceSecondsPerKm,
            Integer previousAveragePaceSecondsPerKm,
            TrendDirection distanceDirection,
            Double distanceChangePercent,
            BigDecimal recentAverageDistanceKm,
            BigDecimal previousAverageDistanceKm,
            TrendBasis basis,
            DataStatus status) {
    }

    public record RecommendationSummary(
            Integer recommendationCount,
            BpmRangeSummary musicBpm,
            Map<String, Integer> genreDistribution,
            String profilePreferredGenre,
            List<SavedPlaylistSummary> savedPlaylists,
            RecommendationBasis basis,
            DataStatus status) {

        public RecommendationSummary {
            genreDistribution = genreDistribution == null
                    ? Map.of()
                    : Map.copyOf(genreDistribution);
            savedPlaylists = savedPlaylists == null
                    ? List.of()
                    : List.copyOf(savedPlaylists);
        }
    }

    public record BpmRangeSummary(
            Integer min,
            Integer max,
            Integer sampleCount,
            DataStatus status) {
    }

    public record SavedPlaylistSummary(
            Long playlistId,
            String title,
            SpotifyExportStatus spotifyExportStatus,
            String spotifyPlaylistUrl,
            LocalDateTime createdAt) {
    }

    public record DataQuality(
            DataStatus overallStatus,
            DataStatus runningRecordsStatus,
            DataStatus cadenceStatus,
            DataStatus heartRateStatus,
            List<String> missingItems) {

        public DataQuality {
            missingItems = missingItems == null
                    ? List.of()
                    : List.copyOf(missingItems);
        }
    }

    public record RecentRunningRecord(
            LocalDate recordDate,
            BigDecimal distanceKm,
            Integer durationSeconds,
            Integer paceSecondsPerKm,
            Integer averageCadence,
            Integer averageHeartRateBpm) {
    }
}
