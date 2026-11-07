# RentalTrack ERD 변경 작업 메모

작성일: 2026-11-07. 현재 코드에서 새 ERD의 수정 영향을 추적하기 위한 메모입니다. 제공된 모델의 분석은 [새 ERD 비교 문서](./rentaltrack-new-erd-review.md)를 참조합니다.

## 기준 사본

- 저장소: `https://github.com/WJLee0417/RentalTrack`
- 리팩터링 브랜치: `refactor/rentaltrack-web-skeleton`, 커밋 `afedc1b699b5e5d2c125aa839c89e0685e875cbe`
- main: `81e5e30c18179b0ddeebe272e019c3b1c1361c28`
- 두 HEAD의 차이는 README이며, 아래 구현·ERD 파일은 동일.
- 로컬 조회 사본: `sources.local/RentalTrack` — 기본 체크아웃은 main, 리팩터링 브랜치 문서는 `git show origin/refactor/rentaltrack-web-skeleton:<path>`로 대조.
- 새 ERD: 사용자 제공 `C:/Users/SSAFY/Downloads/렌탈트랙 (1).damx`. 엔터티 13개·컬럼 108개·관계 객체 14개를 추출하고 기존 코드와 비교함.
- 사용자 결정: 새 ERD 중심 재구성, 지점·수요 예측 활성 기능 제외. 확정 기록 보존·다음 차수 작성·검수 기준 고정 방식으로 구현.
- 구현 브랜치: `codex/rentaltrack-erd-v2`. 실제 MySQL 통합 테스트 21개·화면 빌드·고객/관리자 브라우저 흐름 검증 통과. 아래 기존 구현 연결표는 변경 전 구조를 기록한 것.
- GitHub: [Draft PR #2](https://github.com/WJLee0417/RentalTrack/pull/2), 커밋 `831c6619416d8e9cfe77f020a7f39803e61e18a2`. 대상은 `refactor/rentaltrack-web-skeleton`이며 병합하지 않음.

## 기존 관계와 구현 연결

아래 경로는 RentalTrack 저장소 기준입니다.

| 대상 | 현재 저장 구조 | 주요 코드·API 영향 |
| --- | --- | --- |
| 개별 상품·대여 계약 | `rental_contract.rental_product_id`, 회원·인수 지점·반납 지점 FK | `rental/domain/RentalContract.java`, `rental/application/RentalApplicationService.java`, `rental/api/RentalRequest.java`·`RentalResponse.java` |
| 대여 전·후 상태 | `condition_record`, `UNIQUE(rental_contract_id, record_type)` | `condition/application/ConditionApplicationService.java`, before/after condition API·DTO, 이용 시작 전 BEFORE 사진 검사 |
| 사진 | 상태 기록 FK, 저장 키 UNIQUE, 기록별 촬영 순서 UNIQUE, V8에서 파일 메타데이터 추가·URL 제거 | `condition/domain/ConditionImage.java`, `storage/application/ConditionImageStorageService.java`, multipart 이미지 API·응답·조회 권한 |
| 손상 | 상태 기록 FK, 대여 전 손상 self FK·UNIQUE, 비교 결과 상태 | `damage/application/DamageApplicationService.java`, `damage/domain/DamageRecord.java`, `/damages/before`, `/after`, `/compare` |
| 최종 검수 | `return_inspection.rental_contract_id` UNIQUE | `inspection/application/ReturnInspectionService.java`, 검수 API·DTO, 계약 완료·상품 AVAILABLE/MAINTENANCE 전환 |
| 이력 조회 | 계약·지점·상품·상태를 조회하는 저장소·서비스 | `rental/application/RentalHistoryService.java`, `rental/api/MemberRentalHistoryController.java` |
| 수요 예측 입력 | 대여 계약을 읽는 Python DB 조회 | `ai/demand_forecasting/src/rentaltrack_ai/persistence/mysql_repository.py`; 계약 키·시각·지점 관계 변경 시 추가 추적 |

Java 파일의 공통 접두사는 `backend/src/main/java/com/rentaltrack/`, SQL은 `backend/src/main/resources/db/migration/`입니다.

## 현재 확인한 관계 표기 차이

`docs/ERD.md`의 Mermaid는 다음과 같습니다.

```text
RENTAL_CONTRACT ||--o| CONDITION_RECORD
```

이 표기는 계약당 상태 기록이 0~1건입니다. 같은 문서의 본문과 Flyway V3는 다음을 정의합니다.

```text
record_type = BEFORE_RENTAL / AFTER_RENTAL
UNIQUE (rental_contract_id, record_type)
```

현재 DB에서는 계약당 두 유형을 각각 1건씩 저장할 수 있습니다. 새 ERD가 이 구조를 유지한다면 관계 표기와 유형별 제한 설명을 함께 맞춰야 합니다. 구조를 바꾼다면 서비스·API·테스트까지 새 규칙에 맞춰 수정합니다.

## 새 설계에서 결정할 사항

1. 상품·계약·상태·사진·손상·검수 중 추가·분리·통합되는 엔터티와 변경 목적.
2. 각 FK의 필수 여부, 관계 수, 업무상 중복 제한.
3. 기존 계약·사진·손상 이력을 새 구조로 옮기는 방법.
4. 이용 시작·반납·검수의 상태 전이와 필수 입력 변화.
5. 응답 DTO·경로의 호환성, 프런트엔드와 예측용 조회에 필요한 변경 범위.

## 구현 순서

1. 새 ERD와 현재 모델의 차이 표 작성 완료. 구현 범위·상태 기록 규칙·인증 보존·기존 데이터 이전 필요 여부를 확정.
2. 기존 DB를 갱신한다면 V1~V10 이력에 이어 새 Flyway 마이그레이션 작성; 데이터 이전·FK·UNIQUE·CHECK 검토. 지점→사업자 같은 의미가 다른 값은 임의 매핑하지 않음.
3. JPA 엔터티·저장소 변경과 DB 매핑 대조.
4. 대여·상태·손상·검수 서비스와 API DTO 수정.
5. 아래 기존 테스트를 새 업무 규칙에 맞춰 수정하고 필요한 경계 사례 추가.
6. 프런트엔드·예측 입력 조회의 영향 범위 반영.
7. 실행 결과와 실제 변경 내용을 바탕으로 포트폴리오의 기능·판단·결과 정리.

## 검증에 사용할 기존 테스트

- `Phase1SchemaIntegrationTest`: Flyway·JPA 스키마 대조, 계약/기록 유형 중복 제한, 기존 손상 매칭 중복, 최종 검수 중복.
- `Phase2RentalFlowIntegrationTest`: 신청→인수→대여 전 상태/사진→이용 시작, 사진 없음·중복 인수·중복 요청.
- `Phase2ReturnInspectionIntegrationTest`: 반납→대여 후 상태→손상 비교→검수, 상품 가용/정비 상태 전환.
- `RentalConcurrencyIntegrationTest`: 동일 상품의 동시 대여 요청.
- `RentalHistoryIntegrationTest`, `AccessControlIntegrationTest`, `ImageStorageIntegrationTest`: 이력·권한·이미지 연계 영향.

새 테스트는 `backend/src/test/java/com/rentaltrack/core/`의 WorkflowIntegrationTest·MigrationUpgradeTest에 있습니다. 기존 도메인과 수요 예측 전용 테스트는 새 범위로 교체했으며, 구버전 V10 fixture의 계약·상태·사진·인증 정보 보존도 검증했습니다.
