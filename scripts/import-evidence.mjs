import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dateArg = process.argv.indexOf('--date');
const createdOn = dateArg < 0 ? undefined : process.argv[dateArg + 1];
if (!createdOn || !/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) throw new Error('Provide the snapshot date: --date YYYY-MM-DD');
const output = path.join(root, 'evidence.local');
const manifestPath = path.join(output, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'portfolio_codex_bundle/portfolio-data.json'), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const imports = [
  { folder: 'SSAFIT_Playlist', projectId: 'P003', url: 'https://github.com/WJLee0417/SSAFIT_Playlist' },
  { folder: 'Franchise_Recommendation_DB', projectId: 'P001', url: 'https://github.com/WJLee0417/Franchise_Recommendation_DB' },
];
const sourceArtifacts = [];
const importedFiles = [];
function writeSource(source, sourcePath, bytes, extraction) {
  const text = bytes.toString('utf8');
  if (/\bsk-[a-zA-Z0-9_-]{20,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----|(?:password|api[_-]?key)\s*[:=]\s*["'][^"'\s]{8,}["']/i.test(text)) throw new Error(`Review possible embedded secret before importing: ${sourcePath}`);
  const relative = `projects/${source.projectId}/source/${extraction ? 'python-mysql-excerpt.py' : sourcePath}`;
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  const provenance = { repositoryUrl: source.url, revision: source.revision, path: sourcePath, sourceSha256: sha256(source.read(sourcePath)), ...(extraction ? { extraction } : {}) };
  const record = { path: relative, sha256: sha256(bytes), source: provenance };
  importedFiles.push(record);
  return record;
}
for (const config of imports) {
  const cwd = path.join(root, 'sources.local', config.folder);
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
  const source = { ...config, revision, read: sourcePath => execFileSync('git', ['show', `${revision}:${sourcePath}`], { cwd, maxBuffer: 10 * 1024 * 1024 }) };
  const tree = execFileSync('git', ['ls-tree', '-r', '--name-only', revision], { cwd, encoding: 'utf8' }).trim().split('\n');
  const reportRoot = 'ssafit/src/main/java/com/ssafy/ssafit/airunningreport/';
  const reportTests = 'ssafit/src/test/java/com/ssafy/ssafit/airunningreport/';
  const files = config.projectId === 'P003'
    ? tree.filter(file => file.startsWith(reportRoot) || file.startsWith(reportTests) || file === 'ssafit/src/main/resources/mappers/airunningreport/AiRunningReportMapper.xml' || file === 'ssafit/src/main/resources/sql/migrations/20260624_add_ai_running_reports.sql' || file === 'docs/ai-running-report.md')
    : ['sql/schema.sql', 'sql/sample_queries.sql'];
  const written = new Map(files.map(file => [file, writeSource(source, file, source.read(file))]));
  const mapping = config.projectId === 'P003' ? {
    E014: `${reportRoot}service/AiRunningReportAggregationService.java`,
    E015: `${reportRoot}dto/AiRunningReportAggregationDtos.java`,
    E016: `${reportRoot}service/AiRunningReportGenerationService.java`,
    E017: `${reportRoot}provider/OpenAiRunningReportProvider.java`,
    E018: `${reportRoot}service/AiRunningReportStorageService.java`,
    E019: 'ssafit/src/main/resources/mappers/airunningreport/AiRunningReportMapper.xml',
    E020: `${reportRoot}controller/api/AiRunningReportApiController.java`,
    E021: `${reportTests}service/AiRunningReportGenerationServiceTest.java`,
    E022: 'docs/ai-running-report.md',
  } : { E004: 'sql/schema.sql', E005: 'sql/sample_queries.sql' };
  for (const [evidenceId, sourcePath] of Object.entries(mapping)) {
    const record = written.get(sourcePath);
    if (!record) throw new Error(`Missing upstream artifact: ${sourcePath}`);
    const evidence = data.dimensions.evidence.find(e => e.id === evidenceId);
    sourceArtifacts.push({ evidenceId, projectId: config.projectId, label: evidence.label, kind: evidence.kind, origin: 'UPSTREAM_SOURCE', ...record, createdOn });
  }
  if (config.projectId === 'P001') {
    const notebookPath = 'notebooks/franchise_recommendation.ipynb';
    const notebook = JSON.parse(source.read(notebookPath).toString('utf8'));
    const indices = [1, 3];
    const excerpt = indices.map(index => {
      const cell = notebook.cells[index];
      if (cell.cell_type !== 'code') throw new Error(`Notebook cell changed: ${index}`);
      return `# Upstream notebook code cell ${index} (zero-based)\n${cell.source.join('')}`;
    }).join('\n\n');
    const record = writeSource(source, notebookPath, Buffer.from(excerpt), 'Code cells 1 and 3 (zero-based), unchanged cell source; notebook outputs omitted.');
    const evidence = data.dimensions.evidence.find(e => e.id === 'E006');
    sourceArtifacts.push({ evidenceId: evidence.id, projectId: config.projectId, label: evidence.label, kind: evidence.kind, origin: 'UPSTREAM_SOURCE', ...record, createdOn });
  }
}
manifest.artifacts = [...manifest.artifacts.filter(a => !sourceArtifacts.some(s => s.evidenceId === a.evidenceId)), ...sourceArtifacts];
manifest.importedFiles = importedFiles;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'README.md'), [
  '# 프로젝트 작업 산출물', '',
  '[포트폴리오 사이트](https://wjlee0417.github.io/)에서 소개한 작업의 코드·SQL·설계를 프로젝트별로 모았습니다.', '',
  '## 산출물', '', '| 프로젝트 | 자료 | 유형 |', '| --- | --- | --- |',
  ...manifest.artifacts.map(a => `| ${a.projectId} | [${a.label}](${a.path}) | ${a.origin === 'UPSTREAM_SOURCE' ? '공개 저장소 코드·문서' : '재구성 설계·설명'} |`), '',
  '## 원본 저장소', '',
  ...imports.map(source => `- [${source.folder}](${source.url})`), '',
  '공개 저장소 파일은 manifest.json에 기록한 커밋의 사본입니다. 파일별 원본 경로·커밋·SHA-256을 함께 기록했습니다. Python–MySQL 예제는 원본 노트북의 코드 셀 1·3을 발췌했으며 셀 번호를 기록했습니다.', '',
  '설계 문서는 기존 포트폴리오 데이터를 별도 파일로 정리한 현재 산출물입니다. 공개 저장소의 최신 기준 커밋에는 프로젝트 종료 이후의 정리·개선이 포함될 수 있습니다. 파일 공개와 테스트 실행 결과·개인 작성 범위는 각각 구분합니다.', '',
  '## 자료 추가·갱신', '',
  '사이트의 개별 자료 링크는 이 브랜치의 커밋 SHA로 고정합니다. 실제 파일을 추가하거나 변경한 뒤 manifest.json의 경로·해시·출처를 갱신하고, 사이트의 자료 링크도 새 커밋으로 연결합니다.', '',
  '사이트 배포는 main 브랜치에서만 실행합니다. 이 브랜치는 작업 산출물 보관용입니다.', '',
].join('\n'));
console.log(`Imported ${importedFiles.length} files for ${sourceArtifacts.length} evidence records; total artifacts ${manifest.artifacts.length}`);
