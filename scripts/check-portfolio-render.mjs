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
  const {resolveSlide}=await server.ssrLoadModule('/src/deck-model.ts');
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
  assert.ok(all.includes('계약 A/B/C를 가정한'));
  assert.ok(all.includes('대여 서비스 개념 설계'));
  if(existsSync('dist/portfolio.html')){
    const offline=readFileSync('dist/portfolio.html','utf8');
    assert.equal((offline.match(/class="portfolio-slide /g)??[]).length,20);
    assert.ok(!/<script[^>]+src=|<link[^>]+(?:stylesheet|href=)/i.test(offline),'offline deck must be self-contained');
    assert.ok(offline.includes('hashchange') && offline.includes('data-state-content'));
  }
  console.log('PASS: 20 slides, 25 contributions, every source link, bullet and metric; project deep links; standalone export');
} finally {console.error=originalError;await server.close();}
