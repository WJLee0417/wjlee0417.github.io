# 기술 숙련도 검토

평가일: 2026-11-08. 대상: 상권 분석 DB, 차량 경로 최적화, 러닝 AI 리포트, RentalTrack.
표시 데이터: `portfolio_codex_bundle/portfolio-data.json`의 `profile.skillProficiency`.

## 기준

이 등급은 프로젝트에서 다룬 기술 활용 범위에 대한 평가다. 언어 전반의 지식, 독립 수행 능력, 경력 연차, 운영 숙련도나 백분율 점수로 해석하지 않는다.

- 설계·구현: 데이터 구조, 문제 제약 또는 서비스 예외 흐름을 정하고 구현한 범위가 확인됨.
- 기능 구현: 특정 처리·저장·연동 기능의 구현 범위가 확인됨.
- 기초 활용: 기본 자료 구조, 조회·변환 또는 도구 사용 범위가 확인됨.

## 기술별 판단

| 기술 | 등급 | 판단 근거 | 기여 항목 |
| --- | --- | --- | --- |
| Java | 설계·구현 | 집계 DTO·품질 상태·Provider 예외·응답 정규화·Snapshot 재사용 흐름 | FC013·014·016·017·018 |
| Spring Boot | 설계·구현 | 생성·저장 서비스 분리, Provider 연결, Fallback·재사용·API 연결 | FC016·017·018·019 |
| MyBatis | 기능 구현 | INSERT, 회원·유형·해시 조건 조회, resultMap 매핑 | FC018·019 |
| JSON | 기능 구현 | 집계 Snapshot 직렬화, DTO 파싱, 누락 필드·문자열 정규화 | FC015·017 |
| REST API | 기능 구현 | 외부 HTTP Provider 연동. 생성·최신 조회 엔드포인트는 보조 확인 | FC016; API 파일 E020 |
| SQL | 설계·구현 | 코드 기준 테이블 분리, PK·FK·복합키 DDL, 브랜드·업종·상권 JOIN | FC003·004·006 |
| MySQL | 설계·구현 | 관계형 스키마 및 서비스 저장·조회. 운영·튜닝 역량은 별도 평가하지 않음 | FC003·004·006·018·019 |
| PyMySQL | 기초 활용 | connect/cursor/SELECT/fetchall/description 사용 | FC005 |
| Excel | 기초 활용 | 업종 대응 관계 정리. 고급 함수·자동화는 평가에 포함하지 않음 | FC001·002 |
| Python | 기능 구현 | SQL 연동·입력 데이터 처리·운행 제약·승객 제거/재삽입 탐색 | FC005·007·008·010 |
| Pandas | 기초 활용 | 조회 결과의 DataFrame 변환·데이터 정리. 팀의 유사도·추천·지도 기능은 제외 | FC001·007; E006 |
| NumPy | 기초 활용 | 비용·시간·수요 배열 생성과 인덱싱. 고급 벡터화·수치 최적화 구현으로 확장하지 않음 | FC007 |
| FICO Xpress Mosel | 설계·구현 | 변수·목적함수·배정·도보거리·용량·시간창 제약 작성 | FC008·009 |

## 네 프로젝트 대조와 평가 범위

1. **상권 분석 DB**: 개인 담당 범위에 해당하는 7테이블 DDL, JOIN SQL, Python–MySQL 발췌와 Excel 대응표 설명을 사용. 저장소 전체의 유사도 분석·지도 시각화·최근 v2 구현을 개인 숙련도에 합산하지 않음.
2. **차량 경로 최적화**: 기존에 확인된 Python 제거·재삽입 및 모형 작성 범위를 유지. 공유본의 개인 작성 범위가 전부 확정된 것은 아니므로 코드 분량이나 최근 재실행 결과를 근거로 Python을 상위 등급으로 올리지 않음. NumPy 배열 사용과 Mosel 모형은 구분해서 평가. `DRT.mos`는 템플릿이므로 실제 제약이 있는 `DRT_Xpress.mos`를 검토.
3. **러닝 AI 리포트**: 개인 담당 서비스·Provider·Mapper·Controller를 기준으로 평가. 외부 API의 실제 활성화·운영 실적, 테스트 개인 작성 범위, 분산 동시성·성능 역량은 추가하지 않음.
4. **RentalTrack**: 업무 단계, 상품/계약/기록 관계, 확정 기록 차수와 검수 기준을 검토. 원래 팀 설계 경험과 2026-11의 대화 기반 후속 구현을 구분. 후속 Java/JPA/React/TypeScript 코드 존재만으로 개인 숙련도를 추가·상향하지 않음. SQL·Java·Spring 등급은 기존 개인 담당 자료에서도 뒷받침되는 범위로 한정.

## 검토한 원본

- 상권 DB 고정본: 증빙 브랜치 커밋 `782a00371d2e5859ecc0e22504cb7c2632a9047a`의 `projects/P001/source/sql/schema.sql`, `sql/sample_queries.sql`, `python-mysql-excerpt.py` (상위 저장소 `944b28f6715ace4289ae85d7498910f021046998`).
- 러닝 리포트: 같은 증빙 커밋의 `projects/P003/source/ssafit/src/main/...` 서비스·Provider·Mapper·Controller (상위 저장소 `0e3a07c1d0eae320a6f66a571c5237bf2c114e80`). 로컬 저장소의 동일 기능 파일과 대조.
- DRT: 로컬 원본 ZIP 추출본의 `recovered_alns_20250609.py`, `Xpress/DRT_Xpress.mos`, 기존 기여 항목 FC007–011. 새 입력·실험 자료를 공개하지 않음.
- RentalTrack: E028–032의 고정 커밋 `3c1adca8bfd18fd5737617123c8644b3fc73d6ee`에 해당하는 `WorkflowService.java`, `V11__rebuild_rental_inspection_model.sql`, 기존 FC024–025의 개인 확인 범위.

공개 화면에는 등급과 공통 기준만 표시한다. 이 판단 메모나 프로젝트별 근거를 기술 스택 카드의 요약문으로 옮기지 않는다.
