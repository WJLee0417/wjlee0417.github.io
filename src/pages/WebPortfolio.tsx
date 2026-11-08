import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { data, getFeaturedTechnologiesByProject, type Project } from '../data';
import { deckSlides, slideNumber } from '../deck-model';
import { Bullets, DeckDiagram, WorkCard, ProjectLinks } from './Deck';
import { useWebMotion } from '../web-motion';
import { webDestination } from '../web-navigation';
import { ProjectVisual } from './ProjectVisuals';

const overviews = deckSlides.filter(slide => slide.type === 'overview');
export const webProjects = overviews.map(slide => data.dimensions.projects.find(project => project.id === slide.projectId)!);

function Stack({ project }: { project: Project }) {
  const labels = project.implementationStack ?? getFeaturedTechnologiesByProject(data,project.id).map(tech => tech.label);
  return <div className="web-stack">{labels.map(label => <span key={label}>{label}</span>)}</div>;
}

function ProjectMetrics({ project }: { project: Project }) {
  const records = data.facts.metricRecords.filter(record=>record.projectId===project.id);
  if(!records.length) return null;
  return <div className="web-metrics" data-reveal>{records.map(record=>{
    const definition=data.dimensions.metrics.find(metric=>metric.id===record.metricId)!;
    const category={SCALE:'데이터 규모',CONFIGURATION:'설정',STRUCTURE:'구조',VALIDATION_CONTEXT:'비교 문제'}[definition.category];
    return <div key={record.id}><small>{category}</small><strong>{record.numericValue.toLocaleString('ko-KR')}<span>{definition.unit}</span></strong><h3>{definition.label}</h3><p>{record.context}</p></div>;
  })}</div>;
}

function ExperimentComparison({project}: {project: Project}) {
  const result=project.comparison;
  if(!result) return null;
  const asset=(path:string)=>`${import.meta.env.BASE_URL}${path}`;
  const cases=[...new Set(result.rows.map(row=>row.caseId))].map(caseId=>{
    const rows=result.rows.filter(row=>row.caseId===caseId);
    return {
      before:rows.find(row=>row.variant==='archive-original')!,
      initial:rows.find(row=>row.variant==='arrival-fixed' && row.stage==='initial')!,
      after:rows.find(row=>row.variant==='arrival-fixed' && row.stage==='final')!,
    };
  });
  return <section className="web-experiment" id="follow-up-comparison" aria-labelledby="comparison-heading" data-reveal>
    <p className="web-eyebrow">VALIDATION</p><h2 id="comparison-heading">{result.title}</h2>
    <Bullets text={result.change}/>
    <div className="comparison-scroll" role="region" aria-label="시간창 검사 변경 전후 배정 결과" tabIndex={0}><table><caption>소규모 2입력 · 입력별 5개 시드 · 추가 검증 2026.11<br/>비용: 도착 기준 검사의 초기해 / 5,000회 탐색 후</caption><thead><tr><th>검증 입력</th><th>미배정 승객</th><th>최종 배정</th><th>초기 / 탐색 후 비용</th></tr></thead><tbody>{cases.map(({before,initial,after})=><tr key={after.caseId}><th scope="row">{after.label}</th><td>{before.unassignedPassengers}→{after.unassignedPassengers}명</td><td>{after.servedPassengers}/{after.totalPassengers}명</td><td>{initial.cost?.toLocaleString('ko-KR')} / {after.cost?.toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div>
    <Bullets text={result.interpretation}/>
    <details className="comparison-details"><summary>검증 조건과 도식</summary><Bullets text={result.setup}/><figure><img src={asset(result.figurePath)} alt={result.figureAlt} loading="lazy"/><figcaption>도착 시각을 시간창과 비교하고, 서비스 시간은 이후 운행 시간에 반영</figcaption></figure><p className="comparison-scope">{result.scope.split('\n').join(' · ')}</p><a className="comparison-download" href={asset(result.artifactPath)} target="_blank" rel="noreferrer">시드별 수치·검증 조건 ↗</a></details>
  </section>;
}

function SiteHeader() {
  const location=useLocation();
  return <header className="web-header"><div className="web-wrap web-header-inner">
    <Link className="web-brand" to="/">LEE WONJUN<span>PORTFOLIO</span></Link>
    <nav aria-label="주 메뉴"><Link to="/background" aria-current={location.pathname==='/background'?'page':undefined}>배경·기술</Link><Link to="/projects" aria-current={location.pathname.startsWith('/projects')?'page':undefined}>프로젝트</Link></nav>
    <div className="web-header-contact" id="contact" role="group" aria-label="연락처"><a href={`mailto:${data.profile.contact.email}`}>{data.profile.contact.email}</a>{data.profile.contact.githubUrl && <a href={data.profile.contact.githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub 프로필 · WJLee0417">GitHub · WJLee0417 ↗</a>}</div>
  </div></header>;
}

export function WebLayout() {
  const location=useLocation(),navigate=useNavigate();
  const root=useRef<HTMLDivElement>(null);
  useWebMotion(root,location.key);
  useEffect(()=>{
    if(location.pathname==='/' && new URLSearchParams(location.search).has('slide')){navigate(webDestination(location.search),{replace:true});return;}
    if(location.pathname==='/' && ['#about','#projects'].includes(location.hash)){navigate(location.hash==='#about'?'/background':'/projects',{replace:true});return;}
    if(!new URLSearchParams(location.search).has('section'))window.scrollTo({top:0,behavior:'instant'});
    if(location.hash==='#contact')document.querySelector<HTMLAnchorElement>('.web-header-contact a')?.focus({preventScroll:true});
  },[location.pathname,location.search,location.hash,location.key]);
  return <div className="web-shell" ref={root}><SiteHeader/><div className="web-page" key={location.pathname}><Outlet/></div><footer className="web-footer"><div className="web-wrap"><span>© {data.meta.lastUpdated.slice(0,4)} {data.profile.nameEn}</span><span>{data.profile.eyebrow}</span><Link to="/">Home ↗</Link></div></footer></div>;
}

export function WebHome() {
  useEffect(()=>{document.title=data.meta.portfolioTitle;},[]);
  return <main className="web-entry web-wrap"><div className="web-entry-copy" data-reveal>
    <p className="web-eyebrow">{data.profile.eyebrow}</p><p className="web-hero-name">{data.profile.nameKo} <span>/ {data.profile.nameEn}</span></p>
    <h1>{data.presentation.coverTitle.split('\n').map(line=><span key={line}>{line}</span>)}</h1><div className="web-rule"/><Bullets text={data.profile.intro}/>
    <div className="web-entry-actions"><Link className="web-button web-entry-button web-button-secondary" to="/background">기술 스택 보기 <span aria-hidden="true">↗</span></Link><Link className="web-button web-entry-button" to="/projects">프로젝트 보기 <span aria-hidden="true">↗</span></Link></div>
  </div></main>;
}

export function WebBackground() {
  useEffect(()=>{document.title='Background & Skills · '+data.profile.nameEn;},[]);
  return <main className="web-background-page">
<section className="web-about" id="about"><div className="web-wrap"><div className="web-section-heading" data-reveal><h1 className="web-section-label">01 / BACKGROUND &amp; SKILLS</h1></div><div className="web-about-grid"><div className="web-about-education" data-reveal><h3>Education & Training</h3>{data.profile.education.map(item=><div key={item.institution}><strong>{item.institution}</strong><p>{item.major} · {item.degree}</p></div>)}{data.profile.training.map(item=><div key={item.institution}><strong>{item.institution}</strong><p>{item.track} · {item.display}</p></div>)}<h3>Certificates</h3><p className="web-certificates">{data.profile.certifications.join(' · ')}</p></div><div className="web-about-tools" data-reveal="2">{['Java / Backend','Python / Data','SQL / Database','Optimization','Interface / Tools'].map(group=><div key={group}><h3>{group}</h3><p>{data.dimensions.technologies.filter(tech=>tech.group===group && data.bridges.contributionTechnology.some(link=>link.technologyId===tech.id)).map(tech=>tech.label).join(' · ')}</p></div>)}</div></div></div></section>
  </main>;
}

export function WebProjects() {
  useEffect(()=>{document.title=`Projects · ${data.profile.nameEn}`;},[]);
  return <main className="web-hub web-wrap"><header className="web-section-heading" data-reveal><h1 className="web-section-label">02 / PROJECTS</h1></header>
    <div className="web-project-choices">{webProjects.map((project,index)=><Link className="web-project-choice" to={`/projects/${project.slug}`} key={project.id} data-reveal={index%2+1}>
      <span className="web-choice-number">{slideNumber(index)}</span><div><small>{overviews[index].eyebrow.split(' / ')[1]}</small><h2>{project.name}</h2><p>{project.periodLabel ?? `${project.periodStart} — ${project.periodEnd}`}</p></div><span className="web-choice-arrow" aria-hidden="true">↗</span>
    </Link>)}</div>
  </main>;
}

function Implementation({project}: {project: Project}) {
  return <section className="web-implementation" data-reveal><p className="web-eyebrow">PROJECT IMPLEMENTATION</p><h2>핵심 구현</h2><div>{project.implementationNotes?.map(note=><article key={note.title}><h3>{note.title}</h3><Bullets text={note.body}/></article>)}</div></section>;
}

export function WebProject() {
  const {slug}=useParams(),location=useLocation();
  const project=webProjects.find(project=>project.slug===slug);
  const groups=deckSlides.filter(slide=>slide.projectId===project?.id && slide.type==='work');
  const index=webProjects.findIndex(item=>item.id===project?.id);
  const overview=overviews.find(slide=>slide.projectId===project?.id);
  const diagram=data.diagrams.find(diagram=>diagram.id===overview?.diagramId);
  const requested=new URLSearchParams(location.search).get('section');
  const group=groups.find(group=>group.id===requested || group.contributionIds.some(id=>data.facts.contributions.find(work=>work.id===id)?.sectionAnchor===requested));
  const active=group?.id ?? (requested==='visualization' && project?.visualization ? 'visualization' : requested==='implementation' && project?.implementationNotes?.length ? 'implementation' : requested==='validation-results' && project?.comparison ? 'validation-results' : 'overview');
  const tabsRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    document.title=project?`${project.name} · ${data.profile.nameEn}`:'페이지를 찾을 수 없습니다';
    window.scrollTo({top:0,behavior:'instant'});
  },[slug,location.search]);
  useEffect(()=>{
    const nav=tabsRef.current,link=nav?.querySelector<HTMLElement>('[aria-current]');
    if(nav && link)nav.scrollTo({left:Math.max(0,link.offsetLeft-12),behavior:'instant'});
  },[slug,active]);
  if(!project)return <WebNotFound/>;
  const visualLabel=project.visualization?.kind==='erd'?'ERD':project.visualization?.kind==='report-flow'?'처리 흐름':'탐색 비교';
  const tabs=[{id:'overview',title:'개요'},...(project.visualization?[{id:'visualization',title:visualLabel}]:[]),...(project.implementationNotes?.length?[{id:'implementation',title:'핵심 구현'}]:[]),...groups.map(group=>({id:group.id,title:group.title})),...(project.comparison?[{id:'validation-results',title:'검증 결과'}]:[])];
  const work=group?.contributionIds.map(id=>data.facts.contributions.find(work=>work.id===id)!) ?? [];
  const visual=data.diagrams.find(diagram=>diagram.id===group?.diagramId);
  return <main className="web-project-page" data-project-view={active}><div className="web-wrap">
    <nav className="web-breadcrumb" aria-label="현재 위치"><Link to="/projects">Projects</Link><span>/</span><span>{slideNumber(index)} · {project.name}</span></nav>
    <header className="web-project-masthead"><p className="web-eyebrow">{overview?.eyebrow}</p><h1>{project.name}</h1><p className="web-project-english">{project.nameEn}</p>{project.visualization && active!=='visualization' && <Link className="web-visual-entry" to={`/projects/${project.slug}?section=visualization`}>{visualLabel} 보기 ↗</Link>}</header>
    <nav className="web-project-tabs" ref={tabsRef} aria-label="프로젝트 내용">{tabs.map(tab=><Link key={tab.id} to={tab.id==='overview'?`/projects/${project.slug}`:`/projects/${project.slug}?section=${tab.id}`} aria-current={active===tab.id?'page':undefined}>{tab.title}</Link>)}</nav>
    <div className="web-content-panel" key={active}>
      {active==='overview' && <><section className="web-project-hero" aria-label="프로젝트 개요" data-reveal><div><Bullets text={project.summary}/><Stack project={project}/><dl className="web-project-facts"><div><dt>ROLE</dt><dd>{project.role}</dd></div><div><dt>PERIOD</dt><dd>{project.periodLabel ?? `${project.periodStart} — ${project.periodEnd}`}</dd></div><div><dt>CONTEXT</dt><dd>{project.kind}</dd></div></dl><ProjectLinks project={project}/></div>{diagram && <DeckDiagram diagram={diagram}/>}</section><ProjectMetrics project={project}/></>}
      {active==='implementation' && <Implementation project={project}/>}
      {active==='visualization' && <ProjectVisual project={project}/>}
      {active==='validation-results' && <ExperimentComparison project={project}/>}
      {group && <section className="web-work-section" id={group.id} data-reveal><div className="web-work-heading"><p className="web-eyebrow">{group.eyebrow}</p><h2>{group.title}</h2></div><div className="web-work-grid">{work.map(item=><WorkCard work={item} key={item.id}/>)}</div>{project.visualization?.kind==='erd' && ['commercial-model','rental-model'].includes(group.id)?<ProjectVisual project={project}/>:visual && <DeckDiagram diagram={visual}/>}</section>}
    </div>
    <nav className="web-project-pagination" aria-label="다른 프로젝트"><Link to="/projects"><small>ALL PROJECTS</small><strong>프로젝트 목록 ↗</strong></Link><Link to={`/projects/${webProjects[(index+1)%webProjects.length].slug}`}><small>NEXT PROJECT →</small><strong>{webProjects[(index+1)%webProjects.length].name}</strong></Link></nav>
  </div></main>;
}

export function WebNotFound(){return <main className="web-wrap web-not-found"><p className="web-eyebrow">404 / NOT FOUND</p><h1>페이지를 찾을 수 없습니다.</h1><Link className="web-button" to="/">포트폴리오로 돌아가기 ↗</Link></main>;}
