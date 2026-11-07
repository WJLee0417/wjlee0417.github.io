-- Store generated AI running reports and reuse completed reports for the same input snapshot.

CREATE TABLE ai_running_reports (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    member_id BIGINT UNSIGNED NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    analysis_start_date DATE NULL,
    analysis_end_date DATE NULL,
    input_snapshot_hash CHAR(64) NOT NULL,
    input_snapshot_json JSON NOT NULL,
    status VARCHAR(20) NOT NULL,
    generation_source VARCHAR(20) NOT NULL,
    provider VARCHAR(50) NULL,
    model_name VARCHAR(100) NULL,
    prompt_version VARCHAR(50) NOT NULL,
    report_content_json JSON NULL,
    error_code VARCHAR(50) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_ai_running_reports PRIMARY KEY (id),
    CONSTRAINT fk_ai_running_reports_member
        FOREIGN KEY (member_id) REFERENCES members (id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT ck_ai_running_reports_type
        CHECK (report_type IN ('RUNNING_SUMMARY')),
    CONSTRAINT ck_ai_running_reports_hash
        CHECK (CHAR_LENGTH(input_snapshot_hash) = 64),
    CONSTRAINT ck_ai_running_reports_status
        CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    CONSTRAINT ck_ai_running_reports_source
        CHECK (generation_source IN ('LLM', 'FALLBACK')),
    CONSTRAINT ck_ai_running_reports_content
        CHECK (
            (status = 'COMPLETED' AND report_content_json IS NOT NULL AND error_code IS NULL)
            OR (status = 'FAILED' AND report_content_json IS NULL AND error_code IS NOT NULL)
            OR (status = 'PENDING' AND report_content_json IS NULL AND error_code IS NULL)
        ),
    INDEX idx_ai_running_reports_member_type_created (
        member_id,
        report_type,
        created_at,
        id
    ),
    INDEX idx_ai_running_reports_member_snapshot_status (
        member_id,
        report_type,
        input_snapshot_hash,
        status,
        created_at,
        id
    )
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'AI running report storage and latest lookup';
