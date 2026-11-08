import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { data, getFeaturedTechnologiesByProject, type Project } from '../data';
import { deckSlides, slideNumber } from '../deck-model';
import { Bullets, DeckDiagram, WorkCard, ProjectLinks } from './Deck';
import { useWebMotion } from '../web-motion';
import { webDestination } from '../web-navigation';

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

function SiteHeader({activeSection}: {activeSection: string}) {
  const [open,setOpen]=useState(false);
  const location=useLocation();
  useEffect(()=>setOpen(false),[location]);
  useEffect(()=>{
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);document.querySelector<HTMLButtonElement>('.web-menu')?.focus();}};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);
  },[]);
  return <header className="web-header"><div className="web-wrap web-header-inner"><Link className="web-brand" to="/">LEE WONJUN<span>PORTFOLIO</span></Link><button type="button" className="web-menu" aria-expanded={open} aria-controls="web-navigation" onClick={()=>setOpen(!open)}>{open?'닫기 ×':'메뉴 ☰'}</button><nav id="web-navigation" className={open?'is-open':''} aria-label="주 메뉴"><Link to={{pathname:'/',hash:'#about'}} aria-current={activeSection==='about'?'location':undefined}>About</Link><Link to={{pathname:'/',hash:'#projects'}} aria-current={activeSection==='projects'||location.pathname.startsWith('/projects/')?'location':undefined}>Projects</Link><Link to={{pathname:'/',hash:'#contact'}} aria-current={activeSection==='contact'?'location':undefined}>Contact</Link></nav></div><div className="web-reading-progress" aria-hidden="true"/></header>;
}

export function WebLayout() {
  const location=useLocation();
  const navigate=useNavigate();
  const root=useRef<HTMLDivElement>(null);
  const activeSection=useWebMotion(root,location.key,location.pathname==='/');
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    if(location.pathname==='/' && params.has('slide')){navigate(webDestination(location.search),{replace:true});return;}
    if(location.pathname==='/' && location.hash){
      const frame=requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
      return()=>cancelAnimationFrame(frame);
    }
    if(!new URLSearchParams(location.search).has('section')) window.scrollTo({top:0,behavior:'instant'});
  },[location.pathname,location.search,location.hash,location.key]);
  useEffect(()=>{document.documentElement.classList.toggle('web-home',location.pathname==='/');return()=>document.documentElement.classList.remove('web-home');},[location.pathname]);
  return <div className="web-shell" ref={root}><SiteHeader activeSection={activeSection}/><div className="web-page" key={location.pathname}><Outlet/></div><footer className="web-footer"><div className="web-wrap"><span>© {data.meta.lastUpdated.slice(0,4)} {data.profile.nameEn}</span><span>{data.profile.eyebrow}</span><Link to={{pathname:'/',hash:'#top'}}>처음으로 ↑</Link></div></footer></div>;
}

export function WebHome() {
  useEffect(()=>{document.title=data.meta.portfolioTitle;},[]);
  return <main>
    <section className="web-hero web-wrap" id="top"><div className="web-hero-copy" data-reveal><p className="web-eyebrow">{data.profile.eyebrow}</p><p className="web-hero-name">{data.profile.nameKo} <span>/ {data.profile.nameEn}</span></p><h1>{data.presentation.coverTitle.split('\n').map(line=><span key={line}>{line}</span>)}</h1><div className="web-rule"/><Bullets text={data.profile.intro}/><Link className="web-button" to={{pathname:'/',hash:'#projects'}}>프로젝트 살펴보기 <span>↓</span></Link></div><div className="web-hero-index"><div className="web-index-heading"><span>SELECTED WORK</span><span>01 — 04</span></div>{webProjects.map((project,index)=><Link to={`/projects/${project.slug}`} key={project.id} data-reveal={index+1}><span className="web-project-number">{slideNumber(index)}</span><div><small>{overviews[index].eyebrow.split(' / ')[1]}</small><h2>{project.name}</h2></div><span>↗</span></Link>)}<div className="web-index-footer"><span>Java · Python · SQL</span><span>{data.meta.lastUpdated.slice(0,7).replace('-','. ')}</span></div></div></section>

    <section className="web-about" id="about"><div className="web-wrap"><div className="web-section-heading" data-reveal><h2 className="web-section-label">01 / BACKGROUND &amp; SKILLS</h2></div><div className="web-about-grid"><div className="web-about-education" data-reveal><h3>Education & Training</h3>{data.profile.education.map(item=><div key={item.institution}><strong>{item.institution}</strong><p>{item.major} · {item.degree}</p></div>)}{data.profile.training.map(item=><div key={item.institution}><strong>{item.institution}</strong><p>{item.track} · {item.display}</p></div>)}<h3>Certificates</h3><p className="web-certificates">{data.profile.certifications.join(' · ')}</p></div><div className="web-about-tools" data-reveal="2">{['Java / Backend','Python / Data','SQL / Database','Optimization','Interface / Tools'].map(group=><div key={group}><h3>{group}</h3><p>{data.dimensions.technologies.filter(tech=>tech.group===group && data.bridges.contributionTechnology.some(link=>link.technologyId===tech.id)).map(tech=>tech.label).join(' · ')}</p></div>)}</div></div></div></section>

    <section className="web-section web-wrap" id="projects"><div className="web-section-heading" data-reveal><h2 className="web-section-label">02 / PROJECTS</h2></div><div className="web-project-grid">{webProjects.map((project,index)=><article className="web-project-card" key={project.id} data-reveal={index%2+1}><div className="web-card-meta"><span>{slideNumber(index)} / {overviews[index].eyebrow.split(' / ')[1]}</span><span>{project.periodLabel ?? `${project.periodStart} — ${project.periodEnd}`}</span></div><Link className="web-project-title" to={`/projects/${project.slug}`}><h3>{project.name}</h3><span>↗</span></Link><Bullets text={project.summary}/><Stack project={project}/><div className="web-card-bottom"><span>{project.kind}</span><Link to={`/projects/${project.slug}`}>작업 자세히 보기 →</Link></div></article>)}</div></section>

    <section className="web-contact" id="contact"><div className="web-wrap" data-reveal><h2 className="web-section-label">03 / CONTACT</h2><div className="web-contact-links"><span>{data.profile.nameKo} / {data.profile.nameEn}</span><a href={`mailto:${data.profile.contact.email}`}>{data.profile.contact.email}<span>↗</span></a><a href={`tel:${data.profile.contact.phone}`}>{data.profile.contact.phone}</a></div></div></section>
  </main>;
}

export function WebProject() {
  const {slug}=useParams();
  const location=useLocation();
  const project=webProjects.find(project=>project.slug===slug);
  const groups=deckSlides.filter(slide=>slide.projectId===project?.id && slide.type==='work');
  const index=webProjects.findIndex(item=>item.id===project?.id);
  const overview=overviews.find(slide=>slide.projectId===project?.id);
  const diagram=data.diagrams.find(diagram=>diagram.id===overview?.diagramId);
  const [selected,setSelected]=useState('');
  useEffect(()=>{
    document.title=project?`${project.name} · ${data.profile.nameEn}`:'페이지를 찾을 수 없습니다';
    setSelected('');
    const section=new URLSearchParams(location.search).get('section');
    const work=data.facts.contributions.find(item=>item.projectId===project?.id && item.sectionAnchor===section);
    if(work){const frame=requestAnimationFrame(()=>document.getElementById(`work-${work.id}`)?.scrollIntoView());return()=>cancelAnimationFrame(frame);}
  },[slug,location.search]);
  useEffect(()=>{
    if(!project || !('IntersectionObserver' in window)) return;
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(visible[0])setSelected(visible[0].target.id);
    },{rootMargin:'-150px 0px -45% 0px',threshold:0});
    for(const group of groups){const section=document.getElementById(group.id);if(section)observer.observe(section);}
    return()=>observer.disconnect();
  },[slug]);
  if(!project) return <WebNotFound/>;
  const goTo=(id:string)=>{setSelected(id);document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  return <main className="web-project-page"><div className="web-wrap"><nav className="web-breadcrumb" aria-label="현재 위치"><Link to={{pathname:'/',hash:'#projects'}}>Projects</Link><span>/</span><span>{slideNumber(index)} · {project.name}</span></nav><header className="web-project-hero" data-reveal><div><p className="web-eyebrow">{overview?.eyebrow}</p><h1>{project.name}</h1><p className="web-project-english">{project.nameEn}</p><Bullets text={project.summary}/><Stack project={project}/><dl className="web-project-facts"><div><dt>ROLE</dt><dd>{project.role}</dd></div><div><dt>PERIOD</dt><dd>{project.periodLabel ?? `${project.periodStart} — ${project.periodEnd}`}</dd></div><div><dt>CONTEXT</dt><dd>{project.kind}</dd></div></dl><ProjectLinks project={project}/></div>{diagram && <DeckDiagram diagram={diagram}/>}</header><ProjectMetrics project={project}/>{project.implementationNotes?.length ? <section className="web-implementation" data-reveal><p className="web-eyebrow">PROJECT IMPLEMENTATION</p><h2>핵심 구현</h2><div>{project.implementationNotes.map(note=><article key={note.title}><h3>{note.title}</h3><Bullets text={note.body}/></article>)}</div></section> : null}<ExperimentComparison project={project}/><div className="web-detail-layout"><aside className="web-project-nav"><p>ON THIS PROJECT</p>{project.comparison && <button type="button" onClick={()=>goTo("follow-up-comparison")}><span>↗</span>검증 결과</button>}{groups.map((group,index)=><button type="button" key={group.id} className={selected===group.id?'is-active':''} onClick={()=>goTo(group.id)}><span>{slideNumber(index)}</span>{group.title}</button>)}</aside><div className="web-project-work">{groups.map((group,index)=>{
    const work=group.contributionIds.map(id=>data.facts.contributions.find(work=>work.id===id)!);
    const visual=data.diagrams.find(diagram=>diagram.id===group.diagramId);
    return <section className="web-work-section" id={group.id} key={group.id} data-reveal><div className="web-work-heading"><p className="web-eyebrow">{slideNumber(index)} / {group.eyebrow.split(' / ')[1]}</p><h2>{group.title}</h2></div><div className="web-work-grid">{work.map(item=><WorkCard work={item} key={item.id}/>)}</div>{visual && <DeckDiagram diagram={visual}/>}</section>;
  })}</div></div><nav className="web-project-pagination" aria-label="다른 프로젝트" data-reveal><Link to={`/projects/${webProjects[(index+webProjects.length-1)%webProjects.length].slug}`}><small>← PREVIOUS PROJECT</small><strong>{webProjects[(index+webProjects.length-1)%webProjects.length].name}</strong></Link><Link to={`/projects/${webProjects[(index+1)%webProjects.length].slug}`}><small>NEXT PROJECT →</small><strong>{webProjects[(index+1)%webProjects.length].name}</strong></Link></nav></div></main>;
}

export function WebNotFound(){return <main className="web-wrap web-not-found"><p className="web-eyebrow">404 / NOT FOUND</p><h1>페이지를 찾을 수 없습니다.</h1><Link className="web-button" to="/">포트폴리오로 돌아가기 ↗</Link></main>;}
