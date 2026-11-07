# 프로젝트 자료 브랜치 운영

- 사이트 소스·GitHub Pages 배포: `main`
- 코드·SQL·설계 문서 보관: `codex/portfolio-evidence`
- [프로젝트 자료 모음](https://github.com/WJLee0417/wjlee0417.github.io/tree/codex/portfolio-evidence)

## 현재 연결한 자료

17개 자료 항목을 연결했습니다. 공개 저장소 코드·문서 12개 항목과 재구성 설계 문서 5개 항목입니다. 의존 코드와 테스트를 포함한 원본 사본은 29개 파일입니다.

| 프로젝트 | 코드·문서 | 설계 자료 |
| --- | --- | --- |
| 상권 DB | 7개 테이블 DDL, SQL JOIN, 노트북의 Python–MySQL 연동 코드 셀 | 관계 개념도 |
| 경로 최적화 | — | ALNS 설명 도식 |
| AI 러닝 리포트 | 집계·DTO·생성·Provider·저장·매퍼·컨트롤러·테스트·설계 문서 | — |
| RentalTrack | — | 업무 흐름, 계약 관계 모델, 계약별 상태 예시 |

## 원본과 사이트 연결

1. 원본 저장소의 특정 커밋에서 공개할 파일을 가져옵니다. 코드·SQL·매퍼는 해당 커밋의 바이트를 그대로 보관합니다. 노트북 발췌는 셀 번호와 원본 파일 해시를 기록합니다.
2. 증빙 브랜치 `manifest.json`에 자료 ID, 경로, SHA-256, 원본 저장소·커밋·경로를 기록합니다.
3. 자료를 증빙 브랜치에 커밋·푸시합니다. 현재 최초 자료 커밋은 `782a00371d2e5859ecc0e22504cb7c2632a9047a`입니다.
4. 사이트의 `portfolio-data.json`에서 각 자료 URL을 증빙 브랜치의 **커밋 SHA**로 고정합니다. 브랜치명은 자료 모음 탐색용으로 사용합니다.
5. `evidence-artifacts.lock.json`에 같은 manifest와 증빙 커밋을 기록합니다. 파일을 갱신해도 사이트가 연결한 과거 버전은 유지됩니다.

공개 저장소 기준 커밋:

- 러닝 리포트: `SSAFIT_Playlist` / `0e3a07c1d0eae320a6f66a571c5237bf2c114e80`
- 상권 DB: `Franchise_Recommendation_DB` / `944b28f6715ace4289ae85d7498910f021046998`

이 커밋에는 프로젝트 종료 후 정리·개선이 포함될 수 있습니다. 파일 사본을 확보한 사실과 당시 구현 시점·개인 작성 범위·테스트 실행 결과는 각각 구분합니다.

## 검증

```powershell
npm run validate:data
node scripts/verify-evidence.mjs --local evidence.local
node scripts/verify-evidence.mjs --online
npm run typecheck
npm run build
```

원본 저장소는 로컬의 `sources.local/SSAFIT_Playlist`, `sources.local/Franchise_Recommendation_DB`에서 읽고, 증빙 브랜치는 `evidence.local` 작업 트리를 사용합니다. 두 폴더는 사이트 커밋에서 제외됩니다.

현재 설계 문서 내보내기는 `scripts/build-evidence.mjs --output evidence.local --date YYYY-MM-DD`, 지정한 코드·SQL 가져오기는 `scripts/import-evidence.mjs --date YYYY-MM-DD`로 수행합니다. 설계 내보내기는 커밋된 사이트 데이터를 기준으로 실행합니다. 새로운 원본 유형은 가져오기 매핑에 명시적으로 등록한 뒤 사용합니다.

실제 API 실행 로그·새 테스트 결과·업종 대응 Excel·당시 보고서를 추가하면 같은 방식으로 파일을 등록해 연결할 수 있습니다.
