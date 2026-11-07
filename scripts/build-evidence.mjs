import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputArg = process.argv.indexOf('--output');
if (outputArg < 0 || !process.argv[outputArg + 1]) throw new Error('Usage: node scripts/build-evidence.mjs --output <evidence-worktree>');
const output = path.resolve(process.argv[outputArg + 1]);
if (output === path.resolve(root) || output.split(path.sep).includes('.git')) throw new Error('Use a separate evidence directory');
execFileSync('git', ['diff', '--quiet', 'HEAD', '--', 'portfolio_codex_bundle/portfolio-data.json'], { cwd: root });
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const data = JSON.parse(fs.readFileSync(new URL('../portfolio_codex_bundle/portfolio-data.json', import.meta.url), 'utf8'));
const repository = 'https://github.com/WJLee0417/wjlee0417.github.io';
const branch = 'codex/portfolio-evidence';
const dateArg = process.argv.indexOf('--date');
const createdOn = dateArg < 0 ? undefined : process.argv[dateArg + 1];
if (!createdOn || !/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) throw new Error('Provide the document date: --date YYYY-MM-DD');
const definitions = [
  { id: 'E003', diagram: 'D002', file: 'projects/P001/database-model.md' },
  { id: 'E010', diagram: 'D005', file: 'projects/P002/algorithm-flow.md' },
  { id: 'E023', diagram: 'D010', file: 'projects/P004/rental-lifecycle.md' },
  { id: 'E024', diagram: 'D011', file: 'projects/P004/contract-model.md' },
  { id: 'E025', diagram: 'D012', file: 'projects/P004/condition-history.md' },
];
const safe = value => String(value).replaceAll('"', '&quot;').replaceAll('\n', ' ');
function diagramMarkdown(diagram) {
  if (diagram.entities) {
    const nodes = new Map(diagram.entities.map((name, index) => [name, `n${index}`]));
    const lines = ['flowchart LR', ...diagram.entities.map(name => `  ${nodes.get(name)}["${safe(name)}"]`)];
    for (const [from, to, label] of diagram.relationships ?? []) lines.push(`  ${nodes.get(from)} ---|"${safe(label)}"| ${nodes.get(to)}`);
    return ['```mermaid', ...lines, '```', '', '관계의 표기는 현재 설계 설명에 명시된 범위입니다.'].join('\n');
  }
  if (diagram.stages) return ['```mermaid', 'flowchart LR', ...diagram.stages.map((stage, index) => `  n${index}["${safe(stage)}"]`), ...diagram.stages.slice(1).map((_, index) => `  n${index} --> n${index + 1}`), '```'].join('\n');
  if (diagram.states) return ['| 계약 | 인수 전 | 반납 후 |', '| --- | --- | --- |', ...diagram.states.map(state => `| ${state.label} | ${state.before} | ${state.after} |`)].join('\n');
  throw new Error(`Unsupported diagram: ${diagram.id}`);
}
fs.mkdirSync(output, { recursive: true });
const existingManifestPath = path.join(output, 'manifest.json');
const existingManifest = fs.existsSync(existingManifestPath) ? JSON.parse(fs.readFileSync(existingManifestPath, 'utf8')) : {};
const artifacts = [...(existingManifest.artifacts ?? []).filter(a => !definitions.some(d => d.id === a.evidenceId))];
for (const definition of definitions) {
  const evidence = data.dimensions.evidence.find(e => e.id === definition.id);
  const diagram = data.diagrams.find(d => d.id === definition.diagram);
  if (!evidence || !diagram || evidence.kind !== 'DESIGN' || evidence.verificationStatus !== 'RECONSTRUCTED_DESIGN' || evidence.projectId !== diagram.projectId) throw new Error(`Invalid design mapping: ${definition.id}`);
  const contributions = data.bridges.contributionEvidence.filter(b => b.evidenceId === evidence.id).map(b => data.facts.contributions.find(c => c.id === b.contributionId));
  const content = [
    `# ${evidence.label}`, '', `프로젝트: ${evidence.projectId} · 자료: ${evidence.id} · 작성일: ${createdOn}`,
    '', '**자료 유형: 현재 포트폴리오용 재구성 설계·설명 자료**', '', diagram.disclosure,
    '', '## 설계', '', diagramMarkdown(diagram),
    ...(diagram.id === 'D011' ? ['', 'Member의 세부 연결과 별도로 명시하지 않은 카디널리티·키는 이 자료에서 정의하지 않습니다.'] : []),
    '', '## 수행 내용과 연결', '',
    ...contributions.flatMap(c => [`### ${c.title}`, '', `- 문제: ${c.problem}`, `- 판단: ${c.decision}`, `- 수행: ${c.action}`, `- 결과: ${c.output}`, '']),
    '## 자료 기준', '',
    `[포트폴리오 설계 데이터 기준 커밋](${repository}/blob/${revision}/portfolio_codex_bundle/portfolio-data.json)`,
    '', '현재 문서는 위 데이터에 있는 설계를 별도 파일로 정리한 산출물입니다. 당시 SQL DDL·Python 코드·운영 기록을 제공하는 파일과는 자료 유형을 구분합니다.', '',
  ].join('\n');
  const target = path.join(output, definition.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  artifacts.push({ evidenceId: evidence.id, projectId: evidence.projectId, label: evidence.label, kind: evidence.kind, origin: 'RECONSTRUCTED_DESIGN', path: definition.file, sha256: crypto.createHash('sha256').update(content).digest('hex'), createdOn, sourceCommit: revision });
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ ...existingManifest, version: 1, repositoryUrl: repository, branch, sourceCommit: revision, artifacts }, null, 2) + '\n');
fs.writeFileSync(path.join(output, '.gitattributes'), '* text eol=lf\n');
fs.writeFileSync(path.join(output, 'README.md'), [
  '# 프로젝트 작업 산출물', '',
  '[포트폴리오 사이트](https://wjlee0417.github.io/)에서 소개한 작업의 문서·설계·코드를 프로젝트별로 관리합니다.', '',
  `증빙 브랜치: \`${branch}\`. 사이트 소스와 배포는 \`main\` 브랜치에서 관리합니다.`, '',
  '## 산출물', '', '| 프로젝트 | 자료 | 유형 |', '| --- | --- | --- |',
  ...artifacts.map(a => `| ${a.projectId} | [${a.label}](${a.path}) | ${a.origin === 'UPSTREAM_SOURCE' ? '공개 저장소 코드·문서' : '재구성 설계·설명 자료'} |`), '',
  '## 자료 추가', '',
  '각 프로젝트의 `projects/P00N/source/`에 공개할 실제 코드·SQL·표·보고서를 추가할 수 있습니다. 프로젝트별 자료의 유형과 작성 시점은 `manifest.json`에서 관리합니다.', '',
  '현재 제공하는 문서는 기존 포트폴리오 설계를 파일로 정리한 자료입니다. 당시 원본 코드와 실행 결과를 추가할 때에는 실제 파일과 출처를 함께 등록합니다.', '',
  '사이트의 개별 자료 링크는 커밋 SHA로 고정합니다. 파일을 수정하거나 추가하면 새 커밋을 만든 후 사이트 데이터의 링크와 SHA-256도 갱신합니다.', '',
].join('\n'));
console.log(`Prepared ${artifacts.length} design artifacts from ${revision} in ${output}`);
