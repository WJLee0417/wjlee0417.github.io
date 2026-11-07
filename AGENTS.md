# 프로젝트 작업 지침

이 프로젝트는 `portfolio_codex_bundle/portfolio-data.json`을 콘텐츠 원천으로 사용하는 React 포트폴리오입니다. 실적·개인 기여·수치·기술·링크를 수정할 때는 원본 근거를 확인하고, 확인되지 않은 내용을 추가하지 않습니다.

취업 서류, 포트폴리오 제작·평가, 코딩테스트 및 면접 준비 작업에는 `.agents/skills/README.md`에서 해당 스킬을 확인한 뒤 선택한 `SKILL.md`를 읽습니다. 스킬이 참조하는 `hiring-common/...`은 `.agents/skills/hiring-common/...`으로 해석합니다. 참조 자료는 필요한 것만 읽습니다.

기존 자료의 경로와 사용자 선호가 이 대화에서 이미 제공되었다면 활용합니다. 포트폴리오를 검토해 달라는 요청에서 대상이 이 프로젝트로 명확하면 원본 JSON과 `src/`를 검토 대상으로 사용합니다.

데이터를 수정하면 `npm run validate:data`로 검증하고, 앱 코드를 수정하면 `npm run typecheck`와 `npm run build`를 실행합니다.
