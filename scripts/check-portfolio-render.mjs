import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const data = JSON.parse(readFileSync(new URL('../portfolio_codex_bundle/portfolio-data.json', import.meta.url), 'utf8'));
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalError = console.error;
console.error = (...args) => {
  if (!String(args[0]).includes('useLayoutEffect does nothing on the server')) originalError(...args);
};
const auditCopy = /검증·추가 설명|담당 범위·자료 출처|자료 출처|본인 확인 경험|소스 자료로 기록|원본 자료 기반 재구성|추가 확인 필요|미확보|미연결|증명하는 자료|현재 자료에/;
const render = (Component, path, props = {}) => renderToString(h(MemoryRouter, { initialEntries: [path] },
  h(Routes, null, h(Route, { path: path.startsWith('/projects/') ? '/projects/:slug' : '/', element: h(Component, props) }))));
function checkEditorial(html, label) {
  assert.ok(!auditCopy.test(html), `${label}: review metadata leaked into public copy`);
  assert.ok(!html.includes('evidence-tag'), `${label}: verification badge rendered`);
}
function checkBullets(html, copy, label) {
  const escape = text => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[character]);
  for (const item of copy.split('\n')) {
    assert.ok(item.trim(), `${label}: empty bullet`);
    assert.ok(html.includes(`<li>${escape(item)}</li>`), `${label}: missing bullet ${item}`);
  }
}

try {
  const { default: ProjectDetail } = await server.ssrLoadModule('/src/pages/ProjectDetail.tsx');
  const { default: Home } = await server.ssrLoadModule('/src/pages/Home.tsx');
  const { default: Explorer } = await server.ssrLoadModule('/src/pages/Explorer.tsx');

  for (const project of data.dimensions.projects) {
    const html = render(ProjectDetail, `/projects/${project.slug}`);
    checkEditorial(html, project.id);
    assert.ok(html.includes(project.kind));
    const expected = data.facts.contributions.filter(c => c.projectId === project.id);
    assert.equal((html.match(/class="work-result copy-list"/g) ?? []).length, expected.length, `${project.id}: missing work outcomes`);
    checkBullets(html, project.summary, `${project.id}/summary`);
    checkBullets(html, project.outcomeSummary, `${project.id}/outcome`);
    for (const c of expected) {
      // Results lead their own work entries; implementation details follow them.
      const title = html.indexOf(c.title);
      const outcome = html.indexOf('class="work-result copy-list"', title);
      const details = html.indexOf('class="work-entry-flow"', title);
      assert.ok(title >= 0 && outcome > title && details > outcome, `${c.id}: work order`);
      for (const field of ['problem', 'decision', 'action', 'output']) checkBullets(html, c[field], `${c.id}/${field}`);
    }
    for (const e of data.dimensions.evidence.filter(e => e.projectId === project.id && e.url)) {
      assert.ok(html.includes(e.url), `${project.id}: missing artifact ${e.id}`);
    }
    if (project.id === 'P004') {
      assert.ok(html.includes('대여 서비스 개념 설계'));
      assert.ok(html.includes('계약 A/B/C를 가정한'));
    }
    console.log(`PASS: ${project.id} result-first work, project type and artifact links`);
  }
  const home = render(Home, '/', { explorer: h('div') });
  checkEditorial(home, 'home');
  checkBullets(home, data.profile.intro, 'home/intro');
  for (const project of data.dimensions.projects) checkBullets(home, project.summary, `home/${project.id}`);
  assert.ok(home.includes('설계하고 구현한 작업'));
  for (const project of data.dimensions.projects) {
    const panel = render(Explorer, `/?select=p:${project.id}`);
    checkEditorial(panel, `explorer/${project.id}`);
    assert.ok(panel.includes('contribution-result'));
    checkBullets(panel, project.summary, `explorer/${project.id}/summary`);
    for (const id of project.featuredContributionIds) {
      const work = data.facts.contributions.find(c => c.id === id);
      for (const field of ['problem', 'decision', 'action', 'output']) checkBullets(panel, work[field], `explorer/${id}/${field}`);
    }
  }
  for (const mode of ['capability', 'technology']) {
    checkEditorial(render(Explorer, `/?mode=${mode}`), `explorer/${mode}`);
  }
  console.log('PASS: home and both explorer modes share work-focused copy');
} finally {
  console.error = originalError;
  await server.close();
}
