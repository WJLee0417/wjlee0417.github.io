# 이원준 데이터 엔지니어링 포트폴리오

[포트폴리오 바로 보기](https://wjlee0417.github.io/)

`portfolio_codex_bundle`의 콘텐츠 데이터를 읽는 정적 React 사이트입니다. 프로젝트 상세 4개와 수행 작업 기반 역량·기술 탐색을 제공합니다.

## 실행

```bash
npm install
npm run validate:data
npm run typecheck
npm run check:render
npm run build
npm run dev
```

개발 서버 주소는 `http://127.0.0.1:5173/`입니다. 프로젝트 상세 주소는 HashRouter 형식입니다. 예: `/#/projects/commercial-district`.

## 콘텐츠 관리

- 유일한 콘텐츠 원천: `portfolio_codex_bundle/portfolio-data.json`
- 데이터 타입/관계 계산: 같은 폴더의 `portfolio-types.ts`, `portfolio-selectors.ts`
- 출처, 개인 기여, 지표, 기술 연결, 링크 등은 원본 JSON에 의존합니다. UI 코드에 새 실적을 추가하지 않습니다.
- 연락처는 `profile.contact`에서 관리합니다. 원본 파일 URL이 `null`이면 링크를 표시하지 않습니다.
- 공개 화면은 작성한 코드·모델·설계를 먼저 소개하고, 수행 작업은 결과→문제→판단→구현 순서로 보여줍니다. 자료 상태와 기여 범위의 검토 기록은 JSON 메타데이터와 `docs/`에서 관리합니다.
- 리뷰 반영 사항과 사용자가 제공할 자료는 [추가 자료 목록](docs/portfolio-evidence-needed.md)에 우선순위별로 정리했습니다.
- 연결된 코드·SQL로 구체화한 구현 내용과 파일별 근거는 [콘텐츠 보강 기록](docs/portfolio-source-review.md)에서 확인할 수 있습니다.
- 코드·SQL·설계는 [증빙 전용 브랜치](https://github.com/WJLee0417/wjlee0417.github.io/tree/codex/portfolio-evidence)에 보관하고 커밋 고정 링크로 연결합니다. [자료 추가·갱신 방법](docs/evidence-workflow.md)을 참고하세요.

## 프로젝트 전용 AI 스킬

[Career-Skills](https://github.com/techeer-sv/Career-Skills)의 스킬 12개와 공통 자료를 `.agents/skills/`에 설치했습니다. 사용 예시와 전체 목록은 [스킬 안내](.agents/skills/README.md)를 참고하세요.

다음 대화 턴부터 `$hiring-sim-portfolio-review 이 프로젝트의 포트폴리오를 리뷰해줘`처럼 호출할 수 있습니다. 포트폴리오 제작·리뷰·레드팀, 이력서 피드백, 코딩테스트와 면접 준비를 지원합니다.

## 구현 확인

- 데이터 검증: 4개 프로젝트, 8개 역량, 25개 수행 작업, 9개 수치 기록, 12개 도식, 11개 관계선, 11개 논리 테이블 통과
- TypeScript 타입 검사와 Vite 프로덕션 빌드 통과
- 브라우저에서 375px, 768px, 1280px 너비, 프로젝트 상세 4개, 직접 접속·새로고침, 섹션 딥링크, Capability/Technology 연결 선택을 확인

## GitHub Pages 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 데이터 검증과 빌드를 실행한 후 GitHub Pages에 배포합니다. GitHub 저장소의 Settings → Pages에서 배포 소스를 `GitHub Actions`로 설정합니다. 수정한 파일은 커밋한 뒤 `main`에 push하면 같은 주소에 자동 반영됩니다.
