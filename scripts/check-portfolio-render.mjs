import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const data = JSON.parse(readFileSync('portfolio_codex_bundle/portfolio-data.json','utf8'));
const server = await createServer({server:{middlewareMode:true},appType:'custom'});
const originalError = console.error;
console.error=(...args)=>{if(!String(args[0]).includes('useLayoutEffect does nothing on the server'))originalError(...args);};
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'})[char]);
try {
  const {SlideContent,DeckDocument,default:PortfolioDeck}=await server.ssrLoadModule('/src/pages/Deck.tsx');
  const {resolveSlide}=await server.ssrLoadModule('/src/deck-model.ts');
  const {WebHome,WebProject}=await server.ssrLoadModule('/src/pages/WebPortfolio.tsx');
  const all = renderToStaticMarkup(createElement(DeckDocument,{active:0}));
  assert.equal((all.match(/class="portfolio-slide /g)??[]).length,data.presentation.slides.length);
  assert.equal((all.match(/data-contribution="FC/g)??[]).length,25);
  assert.ok(!/검증·추가 설명|담당 범위·자료 출처|소스 자료로 기록|본인 확인 경험|미확보|추가 확인 필요|\[프로젝트명\]|홍길동/.test(all));
  const rendered=[];
  for(const [index,slide] of data.presentation.slides.entries()){
    const html=renderToStaticMarkup(createElement(SlideContent,{slide,index}));rendered.push(html);
    assert.ok(html.includes(`data-slide-id="${slide.id}"`));
    assert.equal(resolveSlide('/',`?slide=${slide.id}`),index);
    for(const id of slide.contributionIds){
      const c=data.facts.contributions.find(c=>c.id===id);
      for(const field of ['problem','decision','action','output']) for(const item of c[field].split('\n')) assert.ok(html.includes(`<li>${escape(item)}</li>`),`${id}/${field}: lost bullet`);
    }
  }
  for(const evidence of data.dimensions.evidence.filter(item=>item.url)) assert.ok(all.includes(evidence.url),`lost source link ${evidence.id}`);
  for(const project of data.dimensions.projects){
    const expected=data.presentation.slides.findIndex(slide=>slide.projectId===project.id);
    assert.equal(resolveSlide(`/projects/${project.slug}`,''),expected);
    const overview=rendered[expected];
    assert.ok(overview.includes(project.kind));
    for(const metric of data.facts.metricRecords.filter(record=>record.projectId===project.id)) assert.ok(overview.includes(metric.numericValue.toLocaleString('ko-KR')),`lost metric ${metric.id}`);
  }
  assert.equal(resolveSlide('/projects/ai-running-report','?section=snapshot-reuse'),data.presentation.slides.findIndex(s=>s.id==='running-storage'));
  assert.equal(resolveSlide('/','?slide=unknown'),0);
  const app=renderToString(createElement(MemoryRouter,{initialEntries:['/?slide=running-storage']},createElement(PortfolioDeck)));
  assert.ok(app.includes('data-slide-index="6"'));
  assert.ok(all.includes('이전 차수 보존과 검수 기준 고정'));
  assert.ok(all.includes('2026.07–08 · 기능 확장 2026.11'));
  assert.ok(all.includes('2025.05–06 · 추가 검증 2026.11'));
  const workLogCopy=/원본 공유본|원본 입력 재실행|FOLLOW-UP EXPERIMENT|\/ UPDATE|후속 ERD|개편 작업|이 대화|FOLLOW-UP<\/dt>/;
  assert.ok(!workLogCopy.test(all),'slide copy must address portfolio readers');
  assert.ok(all.includes('https://wjlee0417.github.io/RentalTrack/'));
  assert.ok(all.includes('팀 프로젝트 · 대여 이력 관리 서비스'));
  assert.ok(!all.includes('CONCEPT DESIGN'));
  assert.ok(!all.includes('당시 Python 원본 코드는 현재 미확보'));
  assert.ok(!all.includes('Python으로 2-opt 후보 경로 생성'));
  const home=renderToString(createElement(MemoryRouter,null,createElement(WebHome)));
  for(const project of data.dimensions.projects){
    assert.ok(home.includes(`/projects/${project.slug}`));
    const page=renderToString(createElement(MemoryRouter,{initialEntries:[`/projects/${project.slug}`]},createElement(Routes,null,createElement(Route,{path:'/projects/:slug',element:createElement(WebProject)}))));
    const work=data.facts.contributions.filter(c=>c.projectId===project.id);
    assert.equal((page.match(/data-contribution="FC/g)??[]).length,work.length);
    for(const c of work)for(const field of ['problem','decision','action','output'])for(const item of c[field].split('\n'))assert.ok(page.includes(`<li>${escape(item)}</li>`),`web/${c.id}: missing bullet`);
    for(const metric of data.facts.metricRecords.filter(r=>r.projectId===project.id))assert.ok(page.includes(escape(metric.context)),`web/${metric.id}: missing metric context`);
    assert.ok(page.includes(project.kind));
    assert.ok(!workLogCopy.test(page),'project copy must address portfolio readers');
    if(project.periodLabel)assert.ok(page.includes(project.periodLabel));
    if(project.comparison){
      const result=project.comparison;
      assert.ok(page.includes(escape(result.title)) && page.includes(result.artifactPath));
      const clean=page.replace(/<!--[\s\S]*?-->/g,'');
      assert.ok(clean.includes('소규모 2입력 · 입력별 5개 시드 · 추가 검증 2026.11'));
      assert.ok(clean.includes('초기 / 탐색 후 비용'));
      assert.equal((clean.match(/<tbody><tr>|<\/tr><tr>/g)??[]).length,2);
      for(const caseId of new Set(result.rows.map(row=>row.caseId))){
        const before=result.rows.find(row=>row.caseId===caseId && row.variant==='archive-original');
        const initial=result.rows.find(row=>row.caseId===caseId && row.variant==='arrival-fixed' && row.stage==='initial');
        const after=result.rows.find(row=>row.caseId===caseId && row.variant==='arrival-fixed' && row.stage==='final');
        assert.ok(clean.includes(before.unassignedPassengers+'→'+after.unassignedPassengers+'명'));
        assert.ok(clean.includes(after.servedPassengers+'/'+after.totalPassengers+'명'));
        assert.ok(clean.includes(initial.cost+' / '+after.cost));
      }
      for(const item of result.interpretation.split('\n'))assert.ok(page.includes('<li>'+escape(item)+'</li>'));
    }
    assert.ok(!/검증·추가 설명|담당 범위·자료 출처|소스 자료로 기록|미확보|추가 확인 필요/.test(page));
  }
  if(existsSync('dist/portfolio.html')){
    const offline=readFileSync('dist/portfolio.html','utf8');
    assert.equal((offline.match(/class="portfolio-slide /g)??[]).length,20);
    assert.ok(!/<script[^>]+src=|<link[^>]+(?:stylesheet|href=)/i.test(offline),'offline deck must be self-contained');
    assert.ok(offline.includes('hashchange') && offline.includes('data-state-content'));
  }
  console.log('PASS: responsive home + 4 project pages; 20 slides; 25 contributions; source links, bullets, metrics and standalone export');
} finally {console.error=originalError;await server.close();}
