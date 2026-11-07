import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { data, getEvidenceByContribution, getFeaturedTechnologiesByProject, type Contribution, type Diagram, type Project } from '../data';
import { deckSlides, resolveSlide, slideNumber, type DeckSlide } from '../deck-model';

export function Bullets({ text, className = '' }: { text: string; className?: string }) {
  return <ul className={`deck-bullets ${className}`}>{text.split('\n').filter(Boolean).map((line, index) => <li key={index}>{line}</li>)}</ul>;
}

export function ProjectLinks({ project }: { project: Project }) {
  if(!project.links?.length) return null;
  return <div className="project-links">{project.links.map(link=><a href={link.url} key={link.url} target="_blank" rel="noreferrer">{link.label} <span aria-hidden="true">↗</span></a>)}</div>;
}

function WorkLinks({ work }: { work: Contribution }) {
  const evidence = getEvidenceByContribution(data, work.id).filter(item => item.url);
  if (!evidence.length) return null;
  return <div className="deck-code-links">{evidence.map(item => <a key={item.id} href={item.url!} target="_blank" rel="noreferrer">{item.label}<span aria-hidden="true"> ↗</span></a>)}</div>;
}

export function WorkCard({ work }: { work: Contribution }) {
  return <article className="deck-work" id={`work-${work.id}`} data-contribution={work.id}>
    <h3>{work.title}</h3>
    <Bullets text={work.output} className="deck-result"/>
    <div className="deck-work-details">
      <div className="deck-problem"><b>문제</b><Bullets text={work.problem}/></div>
      <div><b>판단</b><Bullets text={work.decision}/></div>
      <div><b>{work.origin === 'HISTORICAL_TEAM_EXPERIENCE' ? '협업' : work.origin === 'RECONSTRUCTED_DESIGN' ? '설계' : '구현'}</b><Bullets text={work.action}/></div>
    </div>
    <WorkLinks work={work}/>
  </article>;
}

export function DeckDiagram({ diagram }: { diagram: Diagram }) {
  const [selected, setSelected] = useState(0);
  const states = diagram.states ?? [];
  const state = states[selected];
  if (diagram.id === 'D007') return <figure className="deck-diagram report-diagram">
    <div className="diagram-topline">REPORT GENERATION</div>
    <div className="diagram-node">Running Records</div><span className="diagram-arrow">↓</span>
    <div className="diagram-node">Server Aggregation <small>통계 집계 · 데이터 품질</small></div><span className="diagram-arrow">↓</span>
    <div className="diagram-node">JSON Snapshot → SHA-256</div>
    <div className="diagram-fork"><div><small>완료 결과 있음</small><strong>기존 리포트 반환</strong></div><div><small>새 생성 · 강제 갱신</small><strong>LLM / Fallback</strong></div></div>
    <div className="diagram-node dark">Persistence → REST API</div>
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
  if (diagram.entities) return <figure className="deck-diagram relation-diagram">
    <div className="diagram-topline">{diagram.projectId === 'P004' ? 'CONTRACT DATA MODEL' : 'RELATIONAL MODEL'}</div>
    <div className="relation-entities">{diagram.entities.map((entity, index) => <span className={index === 0 ? 'primary' : ''} key={entity}>{entity}</span>)}</div>
    <div className="relation-lines">{diagram.relationships?.map(([from, to, key]) => <div key={`${from}-${to}`}><strong>{from}</strong><span>→</span><strong>{to}</strong><code>{key}</code></div>)}</div>
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
  if (diagram.id === 'D001') return <figure className="deck-diagram compact-diagram">
    <div className="diagram-topline">INDUSTRY MAPPING</div>
    <div className="mapping-pair"><div>공정위: 커피<br/>공정위: 음료(커피외)</div><span>→</span><strong>{diagram.facts?.seoulCategory}<small>{diagram.facts?.seoulCode}</small></strong></div>
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
  if (states.length) return <figure className={`deck-diagram state-diagram ${diagram.id === 'D008' ? 'failure-visual' : ''}`}>
    <div className="diagram-topline">{diagram.title}</div>
    <div className="deck-state-options" role="group" aria-label="처리 사례 선택">{states.map((item, index) => <button type="button" key={String(item.label)} aria-pressed={index === selected} data-state-index={index} onClick={() => setSelected(index)}>{item.label}</button>)}</div>
    <div className="deck-state-output" aria-live="polite">{state && <>
      <small>{state.label}</small>
      {typeof state.numericCount === 'number' && <strong className="diagram-count">{state.numericCount}<span> {state.numericUnit ?? '문제'}</span></strong>}
      <strong>{state.statement ?? state.outcome ?? `${state.before} → ${state.after}`}</strong>
    </>}</div>
    {/* Offline HTML uses the same source states without embedding a second data model. */}
    <div className="offline-states" hidden>{states.map((item, index) => <div key={index} data-state-content={index}><small>{item.label}</small>{typeof item.numericCount === 'number' && <strong className="diagram-count">{item.numericCount}<span> {item.numericUnit ?? '문제'}</span></strong>}<strong>{item.statement ?? item.outcome ?? `${item.before} → ${item.after}`}</strong></div>)}</div>
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
  return <figure className={`deck-diagram ${diagram.id === 'D005' ? 'search-diagram' : 'compact-diagram'}`}>
    <div className="diagram-topline">{diagram.title}</div>
    <div className="deck-stage-list">{diagram.stages?.map((stage, index) => <div key={stage}><span>{slideNumber(index)}</span><strong>{stage}</strong></div>)}</div>
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
}

function Overview({ project, slide }: { project: Project; slide: DeckSlide }) {
  const metrics = data.facts.metricRecords.filter(record => record.projectId === project.id);
  const diagram = data.diagrams.find(diagram => diagram.id === slide.diagramId);
  return <div className="deck-overview">
    <div className="overview-copy">
      <p className="deck-project-name">{project.name}</p>
      <Bullets text={project.summary} className="overview-summary"/>
      <dl className="deck-project-meta"><div><dt>ROLE</dt><dd>{project.role}</dd></div><div><dt>PERIOD</dt><dd>{project.periodStart} — {project.periodEnd}</dd></div><div><dt>CONTEXT</dt><dd>{project.kind}</dd></div>{project.followUpPeriod && <div><dt>FOLLOW-UP</dt><dd>{project.followUpPeriod}</dd></div>}</dl>
      <div className="deck-stack">{project.implementationStack ? project.implementationStack.map(label=><span key={label}>{label}</span>) : getFeaturedTechnologiesByProject(data, project.id).map(tech => <span key={tech.id}>{tech.label}</span>)}</div>
      {metrics.length > 0 && <div className="deck-metrics">{metrics.map(record => {
        const definition = data.dimensions.metrics.find(item => item.id === record.metricId)!;
        return <div key={record.id}><small>{definition.category === 'CONFIGURATION' ? '설정' : definition.category === 'STRUCTURE' ? '구조' : definition.category === 'VALIDATION_CONTEXT' ? '비교 문제' : '데이터 규모'}</small><strong>{record.numericValue.toLocaleString('ko-KR')}<span>{definition.unit}</span></strong><p>{definition.label}</p></div>;
      })}</div>}
      {project.id === 'P004' && <div className="design-principle"><small>WORKFLOW</small><Bullets text={project.outcomeSummary}/></div>}
      <ProjectLinks project={project}/>
    </div>
    {diagram && <DeckDiagram diagram={diagram}/>}
  </div>;
}

function Cover({ go }: { go: (index: number) => void }) {
  return <div className="deck-cover-content">
    <div className="cover-meta"><span>{data.profile.nameKo} / {data.profile.nameEn}</span><span>{data.meta.lastUpdated.slice(0,7).replace('-','. ')}</span></div>
    <div className="cover-center"><div><p className="cover-role">{data.profile.role}</p><h1>{data.presentation.coverTitle.split('\n').map((line,index) => <span key={index}>{line}</span>)}</h1><div className="cover-rule"/><Bullets text={data.profile.intro}/></div>
      <div className="cover-projects">{deckSlides.filter(slide=>slide.type==='overview').map((slide,index) => {
        const id = slide.projectId;
        const project = data.dimensions.projects.find(project => project.id === id)!;
        return <button type="button" key={id} data-go-slide={deckSlides.indexOf(slide)} onClick={()=>go(deckSlides.indexOf(slide))}><span>{slideNumber(index)}</span><div><small>{slide.eyebrow.split(' / ')[1]}</small><strong>{project.name}</strong></div><span>↗</span></button>;
      })}</div>
    </div>
    <div className="cover-contact"><div><small>E-MAIL</small><a href={`mailto:${data.profile.contact.email}`}>{data.profile.contact.email}</a></div><div><small>EDUCATION</small><strong>{data.profile.education[0].institution} · {data.profile.education[0].major}</strong></div><div><small>STACK</small><strong>Java · Python · SQL</strong></div></div>
  </div>;
}

function Contents({ go }: { go: (index: number) => void }) {
  const overviews = deckSlides.filter(slide => slide.type === 'overview');
  return <div className="deck-contents">
    <div className="contents-projects">{overviews.map((slide,index) => {
      const project = data.dimensions.projects.find(project => project.id === slide.projectId)!;
      return <button key={slide.id} type="button" data-go-slide={deckSlides.indexOf(slide)} onClick={() => go(deckSlides.indexOf(slide))}><span className="contents-number">{slideNumber(index)}</span><div><small>{slide.chapter}</small><h3>{project.name}</h3><span>{project.role}</span></div><strong>{slideNumber(deckSlides.indexOf(slide))} ↗</strong></button>;
    })}</div>
    <aside className="profile-panel"><span className="deck-label">PROFILE</span><h3>{data.profile.nameKo}<small>{data.profile.nameEn}</small></h3><div><b>EDUCATION & TRAINING</b>{data.profile.education.map(item => <p key={item.institution}>{item.institution}<span>{item.major} · {item.degree}</span></p>)}{data.profile.training.map(item => <p key={item.institution}>{item.institution}<span>{item.track} · {item.display}</span></p>)}</div><div><b>CERTIFICATES</b><p>{data.profile.certifications.join(' · ')}</p></div><div className="profile-tools"><b>TOOLS</b><p>Java · Spring Boot · MyBatis<br/>Python · Pandas · NumPy<br/>MySQL · SQL · Xpress Mosel</p></div></aside>
  </div>;
}

function Closing({ go }: { go: (index: number) => void }) {
  return <div className="closing-content"><div><p className="deck-label">LET’S BUILD TOGETHER</p><h2>{data.presentation.closingTitle.split('\n').map(line => <span key={line}>{line}</span>)}</h2><Bullets text={data.profile.intro}/></div><div className="closing-contact"><span>{data.profile.nameKo} / {data.profile.nameEn}</span><a href={`mailto:${data.profile.contact.email}`}>{data.profile.contact.email}<span>↗</span></a><a href={`tel:${data.profile.contact.phone}`}>{data.profile.contact.phone}</a><button type="button" data-go-slide={1} onClick={() => go(1)}>프로젝트 다시 보기 <span>↗</span></button></div></div>;
}

export function SlideContent({ slide, index, go = () => {} }: { slide: DeckSlide; index: number; go?: (index: number) => void }) {
  const project = data.dimensions.projects.find(project => project.id === slide.projectId);
  const work = slide.contributionIds.map(id => data.facts.contributions.find(work => work.id === id)!);
  const diagram = data.diagrams.find(diagram => diagram.id === slide.diagramId);
  return <section className={`portfolio-slide slide-${slide.type}`} data-slide-id={slide.id} aria-label={`${slideNumber(index)}. ${slide.title}`}>
    <div className="slide-rail"><span>{slide.chapter}</span></div>
    {slide.type === 'cover' ? <Cover go={go}/> : slide.type === 'closing' ? <Closing go={go}/> : <div className="slide-paper">
      <header className="slide-heading"><div><p>{slide.eyebrow}</p><h2>{slide.title}</h2></div><span>{project ? project.followUpPeriod && (slide.type==='overview' || work.some(item=>item.origin==='FOLLOW_UP_IMPLEMENTATION')) ? `${project.followUpPeriod.slice(0,7).replace('-','.')} / UPDATE` : project.periodStart.slice(0,4) : data.profile.role}</span></header>
      <div className={`slide-body ${slide.type === 'work' ? `work-layout ${work.length === 1 ? 'single-work' : ''} ${diagram && work.length > 1 ? 'with-diagram-strip' : ''}` : ''}`}>
        {slide.type === 'contents' && <Contents go={go}/>}
        {slide.type === 'overview' && project && <Overview project={project} slide={slide}/>}
        {slide.type === 'work' && <><div className="work-cards">{work.map(item => <WorkCard key={item.id} work={item}/>)}</div>{diagram && <DeckDiagram diagram={diagram}/>}</>}
      </div>
      <footer className="slide-footer"><span>{project?.nameEn ?? data.presentation.title}</span><strong>{slideNumber(index)} / {deckSlides.length}</strong></footer>
    </div>}
  </section>;
}

function Thumbnail({ slide, index }: { slide: DeckSlide; index: number }) {
  return <div className={`deck-thumbnail thumb-${slide.type}`} aria-hidden="true"><div className="thumb-rail"/><div><small>{slide.eyebrow}</small><strong>{slide.type === 'cover' ? data.presentation.coverTitle : slide.title}</strong><div className="thumb-blocks"><i/><i/><i/></div><span>{slideNumber(index)}</span></div></div>;
}

export function DeckDocument({ active, scale = 1, go = () => {}, onPrint = () => window.print(), onFullscreen, mobileMenu = false, onMenu, basePath = '/deck' }: {
  active: number; scale?: number; go?: (index: number) => void; onPrint?: () => void;
  onFullscreen?: () => void; mobileMenu?: boolean; onMenu?: () => void; basePath?: string;
}) {
  return <div className={`deck-app ${mobileMenu ? 'menu-open' : ''}`}>
    <aside className="deck-sidebar" aria-label="슬라이드 미리보기"><a className="deck-brand" href={`#${basePath}?slide=cover`}>LEE WONJUN<span>PORTFOLIO / 2026</span></a><div className="deck-sidebar-heading"><span>SLIDES</span><span>{deckSlides.length} PAGES</span></div><nav>{deckSlides.map((slide,index) => <button type="button" key={slide.id} data-go-slide={index} data-active={index === active} aria-current={index === active ? 'step' : undefined} aria-label={`${slideNumber(index)} ${slide.title}`} onClick={() => go(index)}><span className="thumb-number">{slideNumber(index)}</span><Thumbnail slide={slide} index={index}/><span className="thumb-title">{slide.title}</span></button>)}</nav><a className="sidebar-download" href="./portfolio.html" download>HTML 덱 다운로드 <span>↓</span></a></aside>
    <main className="deck-main"><header className="deck-toolbar"><div><a className="deck-website-link" href={basePath==='/'?'https://wjlee0417.github.io/':'#/'}>웹페이지 ↗</a><button type="button" className="deck-menu-button" aria-expanded={mobileMenu} data-deck-action="menu" onClick={onMenu}>목차 ☰</button><span className="toolbar-title">{data.presentation.title}</span></div><div><button type="button" data-go-slide={1} onClick={() => go(1)}>프로젝트 목차</button><a href="./portfolio.html" download>HTML 저장 ↓</a><button type="button" data-deck-action="print" onClick={onPrint}>인쇄 / PDF</button><button type="button" data-deck-action="fullscreen" onClick={onFullscreen} aria-label="전체 화면">⛶</button></div></header>
      <div className="deck-viewport"><div className="deck-stage-space" style={{'--slide-scale':scale,width:1440*scale,height:810*scale} as CSSProperties}><div className="deck-stage">{deckSlides.map((slide,index) => <div className="slide-slot" data-slide-index={index} hidden={index !== active} key={slide.id}><SlideContent slide={slide} index={index} go={go}/></div>)}</div></div></div>
      <footer className="deck-controls"><span className="deck-keyboard-hint">← → 이동 <i/> 휠로 넘기기</span><div className="deck-page-controls"><button type="button" data-deck-action="prev" aria-label="이전 슬라이드" disabled={active === 0} onClick={() => go(active-1)}>←</button><span className="deck-page-number" aria-live="polite"><strong>{slideNumber(active)}</strong><span>/ {deckSlides.length}</span></span><button type="button" data-deck-action="next" aria-label="다음 슬라이드" disabled={active === deckSlides.length-1} onClick={() => go(active+1)}>→</button></div><span className="deck-chapter-name">{deckSlides[active].chapter}</span></footer>
    </main>
    <div className="deck-menu-backdrop" onClick={onMenu}/>
  </div>;
}

export default function PortfolioDeck() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = resolveSlide(location.pathname, location.search);
  const [scale, setScale] = useState(1);
  const [mobileMenu, setMobileMenu] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(0);
  const touch = useRef<{x:number;y:number}|null>(null);
  const go = (index: number) => {
    if (index < 0 || index >= deckSlides.length) return;
    navigate(`/deck?slide=${deckSlides[index].id}`);
    setMobileMenu(false);
  };
  useEffect(() => {
    const viewport = rootRef.current?.querySelector('.deck-viewport');
    if (!viewport) return;
    const resize = () => { const box = viewport.getBoundingClientRect(); setScale(Math.max(.1,Math.min((box.width-64)/1440,(box.height-32)/810))); };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const sidebar = rootRef.current?.querySelector('.deck-sidebar');
    const syncSidebar = () => sidebar?.toggleAttribute('inert',window.innerWidth <= 900 && !mobileMenu);
    syncSidebar(); window.addEventListener('resize',syncSidebar);
    return () => window.removeEventListener('resize',syncSidebar);
  }, [mobileMenu]);
  useEffect(() => {
    document.title = `${deckSlides[active].title} · ${data.profile.nameEn}`;
    const viewport = rootRef.current?.querySelector('.deck-viewport');
    viewport?.scrollTo({top:0});
    rootRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({block:'nearest'});
    const keydown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable]')) return;
      const moves: Record<string, number> = {ArrowRight:active+1,ArrowLeft:active-1,PageDown:active+1,PageUp:active-1,Home:0,End:deckSlides.length-1};
      if (event.key === 'Escape') { setMobileMenu(false); return; }
      if (moves[event.key] !== undefined) { event.preventDefault(); go(moves[event.key]); }
    };
    const wheel = (event: WheelEvent) => {
      if (window.innerWidth <= 900 || event.ctrlKey || Math.abs(event.deltaY)<12 || (event.target as HTMLElement)?.closest('a,button')) return;
      event.preventDefault();
      if (Date.now()-wheelLock.current < 650) return;
      wheelLock.current = Date.now();go(active+(event.deltaY>0?1:-1));
    };
    window.addEventListener('keydown',keydown);
    viewport?.addEventListener('wheel',wheel as EventListener,{passive:false});
    return () => {window.removeEventListener('keydown',keydown);viewport?.removeEventListener('wheel',wheel as EventListener);};
  }, [active]);
  return <div ref={rootRef} onTouchStart={event => {touch.current={x:event.touches[0].clientX,y:event.touches[0].clientY};}} onTouchEnd={event => {
    if (!touch.current) return;
    const dx=event.changedTouches[0].clientX-touch.current.x;const dy=event.changedTouches[0].clientY-touch.current.y;
    if(Math.abs(dx)>75 && Math.abs(dx)>Math.abs(dy)*1.5) go(active+(dx<0?1:-1));touch.current=null;
  }}><DeckDocument active={active} scale={scale} go={go} mobileMenu={mobileMenu} onMenu={() => setMobileMenu(!mobileMenu)} onFullscreen={() => {if(document.fullscreenElement) void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{});}}/></div>;
}
