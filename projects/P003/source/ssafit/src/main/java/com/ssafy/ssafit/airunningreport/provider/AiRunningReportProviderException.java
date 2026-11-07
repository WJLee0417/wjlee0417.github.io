package com.ssafy.ssafit.airunningreport.provider;

public class AiRunningReportProviderException extends RuntimeException {

    private final AiRunningReportProviderFailureReason reason;

    public AiRunningReportProviderException(
            AiRunningReportProviderFailureReason reason,
            String message) {
        super(message);
        this.reason = reason;
    }

    public AiRunningReportProviderFailureReason getReason() {
        return reason;
    }
}
