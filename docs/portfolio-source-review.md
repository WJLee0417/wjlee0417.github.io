# 연결 코드·SQL을 반영한 콘텐츠 보강

반영일: 2026-11-07. 콘텐츠 원천은 `portfolio_codex_bundle/portfolio-data.json`이며, 아래는 변경 문구를 검토하기 위한 근거 기록입니다.

기존에 개인 담당으로 정리된 P001·P003의 작업 11개를 구체화했습니다. 담당자·기여율·프로젝트 기간·9개 수치 기록은 변경하지 않았습니다. P002·P004에는 새 구현 주장을 추가하지 않았습니다. 코드의 동작과 구조를 설명하되, 검토한 적 없는 대안이나 성능 개선 수치를 선택 이유·성과로 만들지 않았습니다.

## 기준 자료

- 러닝 리포트: [SSAFIT_Playlist 고정 커밋](https://github.com/WJLee0417/SSAFIT_Playlist/tree/0e3a07c1d0eae320a6f66a571c5237bf2c114e80).
- 상권 DB: [Franchise_Recommendation_DB 고정 커밋](https://github.com/WJLee0417/Franchise_Recommendation_DB/tree/944b28f6715ace4289ae85d7498910f021046998).
- 사이트의 파일별 링크: [증빙 브랜치 고정 커밋](https://github.com/WJLee0417/wjlee0417.github.io/tree/782a00371d2e5859ecc0e22504cb7c2632a9047a). 파일 경로·SHA-256·출처는 `evidence-artifacts.lock.json`에 기록되어 있습니다.

이는 현재 연결된 공개 코드의 스냅샷입니다. 프로젝트 종료 당시 코드 및 각 줄의 개인 작성 이력을 확정하는 자료로 취급하지 않습니다. 특히 상권 저장소의 후속 Demo·웨어하우스 기능은 당시 개인 성과에 추가하지 않았습니다.

## 작업별 근거 대조

| 작업 | 본문에 반영한 구현·판단 | 근거 |
| --- | --- | --- |
| FC003 정규화 | 코드·명칭 기준 테이블 분리, 본체에서 FK 참조 | E004 `schema.sql`의 상권_구분·자치구·행정동·서비스_업종 및 FK |
| FC004 키 설계 | 상권코드·등록번호 PK, 점포의 업종코드+상권코드 복합키, 집계 행 단위 | E004 `schema.sql`의 상권정보·점포·프랜차이즈 정의 |
| FC005 Python 연동 | SELECT → fetchall → cursor.description의 컬럼명 → DataFrame | E006 `python-mysql-excerpt.py`의 노트북 코드 셀 3 발췌 |
| FC006 SQL 연결 | 프랜차이즈 업종코드 → 점포 → 상권, 영업명 조건·매출 내림차순 | E005 `sample_queries.sql`의 ‘특정 프랜차이즈 업종의 상권별 매출 조회’ |
| FC013 집계 | 총 시간/총 거리의 평균 페이스, 최소 4건일 때 최대 3건씩 구간 비교, ±3% 추세 기준 | E014 `AiRunningReportAggregationService.java`의 runningSummary·trendSummary·paceTrend·distanceTrend |
| FC014 품질 | 유효 표본과 누락 건수, 미측정 null, 표본 1건/일부 누락 상태 구분, 기록 없음의 전체 품질 | E014 vitalSummary·dataQuality, E015 집계 DTO |
| FC015 입력 | 서버의 확정 통계 JSON, 수치 생성·재계산 제한, 응답 5개 필드 | E016 `AiRunningReportGenerationService.java`의 SYSTEM_PROMPT·userPrompt·writeSnapshotJson |
| FC016 Provider | 인터페이스 분리, 조건부 등록, 연결·읽기 타임아웃, 응답 추출과 예외 변환 | E017 `OpenAiRunningReportProvider.java`; 호출부는 E016 |
| FC017 응답 처리 | 빈 필드만 보완하고 LLM 출처 유지, 파싱·호출 실패는 전체 FALLBACK, 모두 COMPLETED 저장 | E016 normalizeContent·normalizeField·saveFallback·saveCompleted, E021 관련 테스트 코드 |
| FC018 재사용 | JSON의 SHA-256, 회원·유형·해시·완료 상태 조회, forceRefresh 우회, Fallback도 재사용 대상 | E016 generateLocked·sha256, E018 findReusable, E019 selectLatestReusableBySnapshot |
| FC019 저장·API | 필수값·INSERT 1건 검사, 세션 회원 기준 조회, 신규 201/재사용 200, generated·cacheHit | E018 save, E019 INSERT·SELECT, E020 API 컨트롤러와 같은 모듈의 API DTO |

## 본문·도식에서 지킨 처리 경계

- 전체 평균 페이스는 **총 시간/총 거리**입니다. 추세 비교의 페이스는 **각 구간 기록의 페이스 평균**입니다. 두 계산을 같은 공식으로 설명하지 않았습니다.
- 기록별 평균 심박·케이던스의 최솟값·최댓값을 집계합니다. 원시 센서 측정 전체의 범위라고 설명하지 않았습니다.
- 심박·케이던스 누락만으로 Provider 호출을 생략하지 않습니다. 호출 전 데이터 부족 분기는 현재 코드의 전체 품질 `INSUFFICIENT`를 따릅니다.
- 일부 필드 보완은 `LLM`, 전체 대체는 `FALLBACK` 출처입니다. Fallback도 `COMPLETED`로 저장되므로 같은 Snapshot의 재사용 대상입니다.
- 재사용 SQL에 모델·프롬프트 버전 조건은 없습니다. 버전 자동 무효화, 동시 요청의 중복 생성 방지 보장, 호출 비용 절감률은 추가하지 않았습니다.
- 강도 요약은 현재 코드에서 빈 분포를 반환합니다. 실제 강도 분류를 구현한 것처럼 설명하지 않았습니다.
- SQL은 브랜드와 같은 업종의 상권 매출 조회입니다. 후보 검토용 연결을 추천 순위 알고리즘의 개인 구현 성과로 확대하지 않았습니다.
- 연결된 테스트는 검사 항목의 근거입니다. 원본 Java 테스트 통과·실제 Provider 실행·테스트의 개인 작성 여부를 주장하지 않았습니다.

추가로 필요한 자료는 [자료 제공 우선순위](portfolio-evidence-needed.md)에 정리했습니다.
