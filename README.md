# 이원준 데이터 엔지니어링 포트폴리오

[포트폴리오 바로 보기](https://wjlee0417.github.io/)

`portfolio_codex_bundle`의 콘텐츠 데이터를 읽는 React 반응형 포트폴리오입니다. `warm-ivory-cobalt`의 아이보리 페이퍼·코발트 강조색·사각 패널을 유지하며, 홈과 4개 프로젝트 상세 페이지에서 기존 개조식 작업을 스크롤해 읽을 수 있습니다. 20장 슬라이드 덱도 별도로 제공합니다.

## 실행

```bash
npm install
npm run validate:data
npm run typecheck
npm run check:render
npm run build
npm run dev
```

개발 서버 주소는 `http://127.0.0.1:5173/`입니다.

- 홈: `/#/` — 프로젝트 목록·배경/기술·연락처
- 상세: `/#/projects/commercial-district` — 개요·데이터 규모·수행 작업·코드 링크
- 섹션: `/#/projects/ai-running-report?section=failure-handling`
- 슬라이드: `/#/deck?slide=running-aggregation`

이전 덱의 `/#/?slide=running-aggregation` 주소도 관련 웹 프로젝트 섹션으로 연결합니다. [반응형 웹 구성](docs/portfolio-web.md)을 참고하세요.

## 덱 사용과 공유

- 왼쪽 미리보기·목차·표지의 프로젝트 버튼으로 직접 이동
- ←/→·PageUp/PageDown·Home/End·데스크톱 휠로 슬라이드 이동
- 모바일: 한 장 안에서 세로로 읽기, 목차·이전/다음·좌우 스와이프로 이동
- 전체 화면 버튼: 발표 모드, Esc로 복귀
- `인쇄 / PDF`: 모든 슬라이드를 한 장씩 출력하는 인쇄 스타일
- `HTML 저장`: CSS·JS·콘텐츠를 포함한 단일 파일 다운로드

`npm run build`는 웹사이트와 `dist/portfolio.html`을 함께 생성합니다. 단일 HTML은 네트워크 없이 브라우저에서 열 수 있으며 코드 원문 링크는 인터넷 연결 시 이동합니다. 별도로 내보내려면 `npm run export:deck`을 실행합니다.

## 콘텐츠 관리

- 유일한 콘텐츠 원천: `portfolio_codex_bundle/portfolio-data.json`
- 데이터 타입/관계 계산: 같은 폴더의 `portfolio-types.ts`, `portfolio-selectors.ts`
- 슬라이드 순서·제목·프로젝트/작업/도식 연결: JSON의 `presentation.slides`
- 덱 화면: `src/pages/Deck.tsx`, `src/deck.css`; HTML 출력: `scripts/export-deck.mjs`
- 웹 화면: `src/pages/WebPortfolio.tsx`, `src/web.css`; 도식·작업 카드는 덱과 공유
- 출처, 개인 기여, 지표, 기술 연결, 링크 등은 원본 JSON에 의존합니다. UI 코드에 새 실적을 추가하지 않습니다.
- 연락처는 `profile.contact`에서 관리합니다. 원본 파일 URL이 `null`이면 링크를 표시하지 않습니다.
- 공개 화면은 작성한 코드·모델·설계를 먼저 소개하고, 수행 작업은 결과→문제→판단→구현 순서의 개조식 목록으로 보여줍니다. 자료 상태와 기여 범위의 검토 기록은 JSON 메타데이터와 `docs/`에서 관리합니다.
- 리뷰 반영 사항과 사용자가 제공할 자료는 [추가 자료 목록](docs/portfolio-evidence-needed.md)에 우선순위별로 정리했습니다.
- 연결된 코드·SQL로 구체화한 구현 내용과 파일별 근거는 [콘텐츠 보강 기록](docs/portfolio-source-review.md)에서 확인할 수 있습니다.
- 코드·SQL·설계는 [증빙 전용 브랜치](https://github.com/WJLee0417/wjlee0417.github.io/tree/codex/portfolio-evidence)에 보관하고 커밋 고정 링크로 연결합니다. [자료 추가·갱신 방법](docs/evidence-workflow.md)을 참고하세요.

## 프로젝트 전용 AI 스킬

[Career-Skills](https://github.com/techeer-sv/Career-Skills)의 스킬 12개와 공통 자료를 `.agents/skills/`에 설치했습니다. 사용 예시와 전체 목록은 [스킬 안내](.agents/skills/README.md)를 참고하세요.

다음 대화 턴부터 `$hiring-sim-portfolio-review 이 프로젝트의 포트폴리오를 리뷰해줘`처럼 호출할 수 있습니다. 포트폴리오 제작·리뷰·레드팀, 이력서 피드백, 코딩테스트와 면접 준비를 지원합니다.

## 구현 확인

- 데이터 검증: 4개 프로젝트, 8개 역량, 25개 수행 작업, 9개 수치 기록, 12개 도식, 11개 관계선, 11개 논리 테이블 통과
- TypeScript 타입 검사와 Vite 프로덕션 빌드 통과
- 렌더링 검사: 20개 슬라이드·25개 수행 작업·17개 원문 링크·수치와 개조식 항목, 기존 프로젝트 딥링크, 독립 HTML
- 디자인 기준과 슬라이드 구성: [슬라이드 전환 기록](docs/portfolio-slides.md)

## GitHub Pages 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 데이터 검증과 빌드를 실행한 후 GitHub Pages에 배포합니다. GitHub 저장소의 Settings → Pages에서 배포 소스를 `GitHub Actions`로 설정합니다. 수정한 파일은 커밋한 뒤 `main`에 push하면 같은 주소에 자동 반영됩니다.
