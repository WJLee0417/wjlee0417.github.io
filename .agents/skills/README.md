# Career-Skills — 프로젝트 전용 스킬

[techeer-sv/Career-Skills](https://github.com/techeer-sv/Career-Skills)의 스킬 12개를 이 프로젝트에 설치했습니다. 프로젝트 스킬 경로는 [공식 OpenAI 문서](https://developers.openai.com/api/reference/cli)의 `.agents/skills/` 규칙을 따릅니다.

- 원본 커밋: `9a5d83c5d5176cf0f0918a543f443dbac2f67150`
- 설치일: 2026-11-07
- 라이선스: [MIT](LICENSE.career-skills)
- 버전 및 SHA-256 기록: [career-skills.lock.json](../career-skills.lock.json)
- 각 스킬 폴더와 참조 자료는 원본 그대로 복사했습니다. 원본 `hiring-index.md` 대신 이 목록을 사용합니다.

## 호출 방법

이 프로젝트의 다음 대화 턴부터 `$스킬이름`과 요청을 함께 입력합니다. 요청 예시:

```text
$hiring-sim-portfolio-review 이 프로젝트의 포트폴리오를 리뷰해줘.
$hiring-sim-portfolio-redteam portfolio_codex_bundle/portfolio-data.json의 수치와 근거를 점검해줘.
$portfolio-build 기존 프로젝트 자료로 슬라이드 포트폴리오를 만들어줘. 디자인은 자동으로 골라줘.
```

관련 요청을 자연어로 해도 스킬 설명에 따라 선택될 수 있습니다.

| 용도 | 스킬 |
| --- | --- |
| 포트폴리오 제작 | [portfolio-build](portfolio-build/SKILL.md) |
| 포트폴리오 리뷰 | [hiring-sim-portfolio-review](hiring-sim-portfolio-review/SKILL.md) |
| 포트폴리오 감점 점검 | [hiring-sim-portfolio-redteam](hiring-sim-portfolio-redteam/SKILL.md) |
| 이력서 리뷰 | [hiring-sim-resume-review](hiring-sim-resume-review/SKILL.md) |
| 이력서 감점 점검 | [hiring-sim-resume-redteam](hiring-sim-resume-redteam/SKILL.md) |
| 서류 피드백 | [hiring-prep-doc-feedback](hiring-prep-doc-feedback/SKILL.md) |
| Kevin 스타일 이력서 피드백 | [kevin-feedback](kevin-feedback/SKILL.md) |
| 회사별 코딩테스트 준비 | [hiring-prep-coding-test](hiring-prep-coding-test/SKILL.md) |
| 코딩테스트 시뮬레이션 | [hiring-sim-coding-test](hiring-sim-coding-test/SKILL.md) |
| 면접 준비 | [hiring-prep-interview](hiring-prep-interview/SKILL.md) |
| 면접 시뮬레이션 | [hiring-sim-interview](hiring-sim-interview/SKILL.md) |
| 통합 채용 시뮬레이션 | [hiring-sim-pipeline](hiring-sim-pipeline/SKILL.md) |

공통 자료는 `hiring-common/`에 있습니다. 스킬 본문의 `hiring-common/...` 경로는 이 디렉터리를 기준으로 해석합니다. 포트폴리오 디자인 5종과 PDF 이미지 추출 스크립트도 `portfolio-build/`에 포함했습니다. PDF 이미지 추출 기능은 별도 Python 환경이 필요합니다.

원본 README와 인덱스에는 `writing-prep-cover-letter`도 기재되어 있으나, 설치한 커밋에는 해당 폴더가 없어 포함하지 않았습니다.

## 이 프로젝트의 자료

현재 웹 포트폴리오의 콘텐츠 원천은 `portfolio_codex_bundle/portfolio-data.json`입니다. 리뷰할 때는 `src/`의 표현과 원본 데이터를 대조하고, 수정할 때는 원본 근거에 있는 실적·기여·지표만 사용합니다. `portfolio-build`는 별도의 슬라이드 HTML을 만드는 스킬이므로 산출물 형식은 요청에 맞춰 결정합니다.
