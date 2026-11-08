import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const data = JSON.parse(readFileSync('portfolio_codex_bundle/portfolio-data.json','utf8'));
const server = await createServer({server:{middlewareMode:true},appType:'custom'});
const originalError = console.error;
console.error=(...args)=>{if(!String(args[0]).includes('useLayoutEffect does nothing on the server'))originalError(...args);};
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'})[char]);
try {
  const {SlideContent,DeckDocument,default:PortfolioDeck}=await server.ssrLoadModule('/src/pages/Deck.tsx');
  const {resolveSlide,resolvePanel,slidePanels}=await server.ssrLoadModule('/src/deck-model.ts');
  const {default:PortfolioRoutes}=await server.ssrLoadModule('/src/App.tsx');
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
  assert.equal(resolvePanel(data.presentation.slides.find(s=>s.id==='rental-model'),'?section=data-model'),1);
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
  assert.ok(!/Software Developer|SOFTWARE DEVELOPER|소프트웨어 개발자/.test(all));
  assert.ok(!all.includes('LET’S BUILD TOGETHER') && !all.includes('다음 프로젝트를'));
  const home=renderToString(createElement(MemoryRouter,null,createElement(PortfolioRoutes)));
  assert.ok(home.includes('class="deck-app ') && !home.includes('web-shell'));
  for(const [index,slide] of data.presentation.slides.entries()){
    const panels=slidePanels(slide);
    for(const [part,label] of panels.entries()){
      assert.equal(resolvePanel(slide,`?part=${part}`),part);
      const html=renderToStaticMarkup(createElement(SlideContent,{slide,index,part}));
      if(slide.type!=='closing'){
        assert.ok(html.includes(`data-slide-panel="${part}" data-panel-label="${escape(label)}" data-panel-active="true"`),`unreachable mobile content: ${slide.id}/${part}`);
        assert.equal((html.match(/data-panel-active="true"/g)??[]).length,1);
      }
    }
    for(const bad of ['-1','100','NaN','0.5'])assert.equal(resolvePanel(slide,`?part=${bad}`),0);
  }
  for(const project of data.dimensions.projects){
    const page=renderToString(createElement(MemoryRouter,{initialEntries:[`/projects/${project.slug}`]},createElement(PortfolioRoutes)));
    const expected=data.presentation.slides.findIndex(s=>s.projectId===project.id);
    assert.ok(page.includes(`class="slide-slot" data-slide-index="${expected}"><section`),`project route failed ${project.id}`);
    assert.ok(page.includes(project.kind));
    assert.ok(!workLogCopy.test(page),'project copy must address portfolio readers');
    if(project.periodLabel)assert.ok(page.includes(project.periodLabel));
    assert.ok(!/검증·추가 설명|담당 범위·자료 출처|소스 자료로 기록|미확보|추가 확인 필요/.test(page));
  }
  for(const alias of ['/deck?slide=rental','/?slide=rental']){
    const html=renderToString(createElement(MemoryRouter,{initialEntries:[alias]},createElement(PortfolioRoutes)));
    const expected=data.presentation.slides.findIndex(s=>s.id==='rental');
    assert.ok(html.includes(`class="slide-slot" data-slide-index="${expected}"><section`));
  }
  if(existsSync('dist/portfolio.html')){
    const offline=readFileSync('dist/portfolio.html','utf8');
    assert.equal((offline.match(/class="portfolio-slide /g)??[]).length,20);
    assert.ok(!/<script[^>]+src=|<link[^>]+(?:stylesheet|href=)/i.test(offline),'offline deck must be self-contained');
    assert.ok(offline.includes('hashchange') && offline.includes('data-state-content'));
  }
  console.log('PASS: default slide routes + project links; 20 slides; mobile panels; 25 contributions; source links, bullets, metrics and standalone export');
} finally {console.error=originalError;await server.close();}
