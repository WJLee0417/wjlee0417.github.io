# 이원준 데이터 엔지니어링 포트폴리오

`portfolio_codex_bundle`의 콘텐츠 데이터를 읽는 정적 React 사이트입니다. 프로젝트 상세 4개와 수행 작업 기반 역량·기술 탐색을 제공합니다.

## 실행

```bash
npm install
npm run validate:data
npm run typecheck
npm run build
npm run dev
```

개발 서버 주소는 `http://127.0.0.1:5173/`입니다. 프로젝트 상세 주소는 HashRouter 형식입니다. 예: `/#/projects/commercial-district`.

## 콘텐츠 관리

- 유일한 콘텐츠 원천: `portfolio_codex_bundle/portfolio-data.json`
- 데이터 타입/관계 계산: 같은 폴더의 `portfolio-types.ts`, `portfolio-selectors.ts`
- 출처, 개인 기여, 지표, 기술 연결, 링크 등은 원본 JSON에 의존합니다. UI 코드에 새 실적을 추가하지 않습니다.
- 연락처는 `profile.contact`에서 관리합니다. 원본 파일 URL이 `null`이면 링크를 표시하지 않습니다.

## 구현 확인

- 데이터 검증: 4개 프로젝트, 8개 역량, 25개 수행 작업, 9개 수치 기록, 12개 도식, 11개 관계선, 11개 논리 테이블 통과
- TypeScript 타입 검사와 Vite 프로덕션 빌드 통과
- 브라우저에서 375px, 768px, 1280px 너비, 프로젝트 상세 4개, 직접 접속·새로고침, 섹션 딥링크, Capability/Technology 연결 선택을 확인

## GitHub Pages 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 데이터 검증과 빌드를 실행한 후 GitHub Pages에 배포합니다. GitHub 저장소의 Settings → Pages에서 배포 소스를 `GitHub Actions`로 설정합니다. 수정한 파일은 커밋한 뒤 `main`에 push하면 같은 주소에 자동 반영됩니다.
