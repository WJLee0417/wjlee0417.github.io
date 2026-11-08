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
  const {webDestination}=await server.ssrLoadModule('/src/web-navigation.ts');
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
  assert.ok(home.includes('class="web-shell"') && !home.includes('class="deck-app '));
  const presentationChrome=/deck-sidebar|deck-toolbar|deck-page-controls|슬라이드로 보기|인쇄 \/ PDF|HTML 저장/;
  assert.ok(!presentationChrome.test(home));
  assert.ok(!/Software Developer|소프트웨어 개발자/.test(home));
  const renderPage=path=>renderToString(createElement(MemoryRouter,{initialEntries:[path]},createElement(PortfolioRoutes)));
  assert.ok(home.includes('포트폴리오 보기') && home.includes('href="/projects"'));
  assert.ok(home.includes(`href="mailto:${data.profile.contact.email}"`) && home.includes(`href="${data.profile.contact.githubUrl}"`));
  assert.ok(home.includes('GitHub · WJLee0417') && !home.includes('href="tel:'));
  assert.ok(!home.includes('class="web-about"') && !home.includes('web-project-choices') && !home.includes('class="web-contact"'));
  assert.ok(renderPage('/background').includes('01 / BACKGROUND &amp; SKILLS'));
  const projectList=renderPage('/projects');
  assert.ok(projectList.includes('02 / PROJECTS'));
  for(const project of data.dimensions.projects)assert.ok(projectList.includes(`href="/projects/${project.slug}"`));
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
    const page=renderPage(`/projects/${project.slug}`);
    assert.ok(page.includes(`<h1>${escape(project.name)}</h1>`),`project route failed ${project.id}`);
    assert.ok(!presentationChrome.test(page));
    assert.equal((page.match(/data-contribution="FC/g)??[]).length,0,'overview must not stack every work section');
    const groups=data.presentation.slides.filter(s=>s.projectId===project.id && s.type==='work');
    for(const group of groups){
      const selected=renderPage(`/projects/${project.slug}?section=${group.id}`);
      assert.equal((selected.match(/data-contribution="FC/g)??[]).length,group.contributionIds.length);
      assert.ok(!workLogCopy.test(selected) && !presentationChrome.test(selected));
      for(const id of group.contributionIds){
        const c=data.facts.contributions.find(c=>c.id===id);
        for(const field of ['problem','decision','action','output'])for(const item of c[field].split('\n'))assert.ok(selected.includes(`<li>${escape(item)}</li>`),`${c.id}/${field}: missing web bullet`);
        for(const link of data.bridges.contributionEvidence.filter(link=>link.contributionId===id)){
          const evidence=data.dimensions.evidence.find(e=>e.id===link.evidenceId);if(evidence?.url)assert.ok(selected.includes(evidence.url),`web/${evidence.id}: lost code link`);
        }
        const firstGroup=groups.find(g=>g.contributionIds.some(id=>data.facts.contributions.find(c=>c.id===id).sectionAnchor===c.sectionAnchor));
        const firstId=firstGroup.contributionIds.find(id=>data.facts.contributions.find(c=>c.id===id).sectionAnchor===c.sectionAnchor);
        assert.ok(renderPage(`/projects/${project.slug}?section=${c.sectionAnchor}`).includes(`data-contribution="${firstId}"`),`legacy section failed ${c.sectionAnchor}`);
      }
    }
    for(const metric of data.facts.metricRecords.filter(r=>r.projectId===project.id))assert.ok(page.includes(escape(metric.context)),`web/${metric.id}: missing metric context`);
    assert.ok(page.includes(project.kind));
    assert.ok(!workLogCopy.test(page),'project copy must address portfolio readers');
    if(project.periodLabel)assert.ok(page.includes(project.periodLabel));
    if(project.visualization){
      const model=project.visualization,visualPage=renderPage(`/projects/${project.slug}?section=visualization`);
      assert.ok(page.includes(`href="/projects/${project.slug}?section=visualization"`));
      assert.ok(visualPage.includes(`data-visual-kind="${model.kind}"`) && visualPage.includes(escape(model.title)));
      for(const source of model.sources)assert.ok(visualPage.includes(source.url),`visual source link lost ${project.id}`);
      if(model.kind==='erd'){
        for(const name of model.views[0].lanes.flat()){const table=model.tables.find(table=>table.name===name);assert.ok(visualPage.includes(`class="erd-table-name">${escape(table.displayName??name)}</text>`),`default ERD table label lost ${name}`);}
        assert.ok(visualPage.includes('전체 컬럼') && visualPage.includes('크게 보기'));
        const focus=model.tables.find(table=>table.name===model.views[0].focus);
        for(const column of focus.columns)assert.ok(visualPage.includes(`<th scope="row">${escape(column.displayName??column.name)}</th>`) && visualPage.includes(escape(column.type)),`ERD detail lost ${focus.name}/${column.name}`);
        if(project.id==='P001')assert.ok(visualPage.includes('service_industry_code + commercial_area_code') && visualPage.includes('SQL 이름 대응표') && visualPage.replace(/<!--[\s\S]*?-->/g,'').includes('area_industry_metrics.'));
      }else if(model.kind==='report-flow'){
        for(const scenario of model.scenarios)assert.ok(visualPage.includes(escape(scenario.label)));
        assert.ok(visualPage.includes('generationSource') && visualPage.includes('cacheHit'));
      }else assert.ok(visualPage.includes('완료해 없음') && visualPage.includes('시간창'));
    }
    if(project.implementationNotes?.length){
      const implementation=renderPage(`/projects/${project.slug}?section=implementation`);
      for(const note of project.implementationNotes){assert.ok(implementation.includes(escape(note.title)));for(const line of note.body.split('\n'))assert.ok(implementation.includes(`<li>${escape(line)}</li>`));}
    }
    if(project.comparison){
      const comparison=renderPage(`/projects/${project.slug}?section=validation-results`);
      assert.ok(comparison.includes(project.comparison.artifactPath));
      const clean=comparison.replace(/<!--[\s\S]*?-->/g,'');
      for(const caseId of new Set(project.comparison.rows.map(r=>r.caseId))){
        const rows=project.comparison.rows.filter(r=>r.caseId===caseId),before=rows[0],initial=rows[1],after=rows[2];
        assert.ok(clean.includes(`${before.unassignedPassengers}→${after.unassignedPassengers}명`));
        assert.ok(clean.includes(`${after.servedPassengers}/${after.totalPassengers}명`));
        assert.ok(clean.includes(`${initial.cost} / ${after.cost}`));
      }
      for(const item of project.comparison.interpretation.split('\n'))assert.ok(comparison.includes(`<li>${escape(item)}</li>`));
    }
    assert.ok(!/검증·추가 설명|담당 범위·자료 출처|소스 자료로 기록|미확보|추가 확인 필요/.test(page));
  }
  for(const slide of data.presentation.slides){
    const destination=webDestination(`?slide=${slide.id}`);
    if(slide.projectId){const project=data.dimensions.projects.find(p=>p.id===slide.projectId);assert.equal(destination.pathname,`/projects/${project.slug}`);}
    else assert.ok(['/','/projects','/background'].includes(destination.pathname));
  }
  assert.equal(webDestination('?slide=closing').hash,'#contact');
  assert.equal(webDestination('?slide=contents&part=1').pathname,'/background');
  assert.equal(webDestination('?slide=rental-model&part=1').search,'?section=data-model');
  assert.equal(webDestination('?slide=routing-results').search,'?section=routing-results');
  if(existsSync('dist/portfolio.html')){
    const offline=readFileSync('dist/portfolio.html','utf8');
    assert.equal((offline.match(/class="portfolio-slide /g)??[]).length,20);
    assert.ok(!/<script[^>]+src=|<link[^>]+(?:stylesheet|href=)/i.test(offline),'offline deck must be self-contained');
    assert.ok(offline.includes('hashchange') && offline.includes('data-state-content'));
  }
  console.log('PASS: compact home + content destinations; project section navigation; 25 contributions; legacy links; comparisons; source links; standalone export');
} finally {console.error=originalError;await server.close();}
