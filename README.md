# 프로젝트 작업 산출물

[포트폴리오 사이트](https://wjlee0417.github.io/)에서 소개한 작업의 코드·SQL·설계를 프로젝트별로 모았습니다.

## 산출물

| 프로젝트 | 자료 | 유형 |
| --- | --- | --- |
| P001 | [7개 관계형 테이블의 개념·논리 ERD](projects/P001/database-model.md) | 재구성 설계·설명 |
| P002 | [ALNS 탐색 절차 재구성 도식](projects/P002/algorithm-flow.md) | 재구성 설계·설명 |
| P004 | [신청→인수→이용→반납→검수 업무 흐름 재구성](projects/P004/rental-lifecycle.md) | 재구성 설계·설명 |
| P004 | [상품·계약·상태 기록 관계 개념도](projects/P004/contract-model.md) | 재구성 설계·설명 |
| P004 | [계약별 상태·사진·손상 이력 재구성](projects/P004/condition-history.md) | 재구성 설계·설명 |
| P003 | [AiRunningReportAggregationService.java](projects/P003/source/ssafit/src/main/java/com/ssafy/ssafit/airunningreport/service/AiRunningReportAggregationService.java) | 공개 저장소 코드·문서 |
| P003 | [AiRunningReportAggregationDtos.java](projects/P003/source/ssafit/src/main/java/com/ssafy/ssafit/airunningreport/dto/AiRunningReportAggregationDtos.java) | 공개 저장소 코드·문서 |
| P003 | [AiRunningReportGenerationService.java](projects/P003/source/ssafit/src/main/java/com/ssafy/ssafit/airunningreport/service/AiRunningReportGenerationService.java) | 공개 저장소 코드·문서 |
| P003 | [외부 LLM API Provider 구현 파일](projects/P003/source/ssafit/src/main/java/com/ssafy/ssafit/airunningreport/provider/OpenAiRunningReportProvider.java) | 공개 저장소 코드·문서 |
| P003 | [AiRunningReportStorageService.java](projects/P003/source/ssafit/src/main/java/com/ssafy/ssafit/airunningreport/service/AiRunningReportStorageService.java) | 공개 저장소 코드·문서 |
| P003 | [AiRunningReportMapper.xml](projects/P003/source/ssafit/src/main/resources/mappers/airunningreport/AiRunningReportMapper.xml) | 공개 저장소 코드·문서 |
| P003 | [AiRunningReportApiController.java](projects/P003/source/ssafit/src/main/java/com/ssafy/ssafit/airunningreport/controller/api/AiRunningReportApiController.java) | 공개 저장소 코드·문서 |
| P003 | [AI 리포트 테스트 코드](projects/P003/source/ssafit/src/test/java/com/ssafy/ssafit/airunningreport/service/AiRunningReportGenerationServiceTest.java) | 공개 저장소 코드·문서 |
| P003 | [docs/ai-running-report.md](projects/P003/source/docs/ai-running-report.md) | 공개 저장소 코드·문서 |
| P001 | [MySQL DDL 발췌](projects/P001/source/sql/schema.sql) | 공개 저장소 코드·문서 |
| P001 | [SQL JOIN 발췌](projects/P001/source/sql/sample_queries.sql) | 공개 저장소 코드·문서 |
| P001 | [Python–MySQL 연동 설명](projects/P001/source/python-mysql-excerpt.py) | 공개 저장소 코드·문서 |

## 원본 저장소

- [SSAFIT_Playlist](https://github.com/WJLee0417/SSAFIT_Playlist)
- [Franchise_Recommendation_DB](https://github.com/WJLee0417/Franchise_Recommendation_DB)

공개 저장소 파일은 manifest.json에 기록한 커밋의 사본입니다. 파일별 원본 경로·커밋·SHA-256을 함께 기록했습니다. Python–MySQL 예제는 원본 노트북의 코드 셀 1·3을 발췌했으며 셀 번호를 기록했습니다.

설계 문서는 기존 포트폴리오 데이터를 별도 파일로 정리한 현재 산출물입니다. 공개 저장소의 최신 기준 커밋에는 프로젝트 종료 이후의 정리·개선이 포함될 수 있습니다. 파일 공개와 테스트 실행 결과·개인 작성 범위는 각각 구분합니다.

## 자료 추가·갱신

사이트의 개별 자료 링크는 이 브랜치의 커밋 SHA로 고정합니다. 실제 파일을 추가하거나 변경한 뒤 manifest.json의 경로·해시·출처를 갱신하고, 사이트의 자료 링크도 새 커밋으로 연결합니다.

사이트 배포는 main 브랜치에서만 실행합니다. 이 브랜치는 작업 산출물 보관용입니다.
