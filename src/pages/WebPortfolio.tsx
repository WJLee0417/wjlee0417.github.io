import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { data, getFeaturedTechnologiesByProject, getDesignFocusByProject, type Project } from '../data';
import { deckSlides, slideNumber } from '../deck-model';
import { Bullets, DeckDiagram, WorkCard } from './Deck';

const overviews = deckSlides.filter(slide => slide.type === 'overview');
export const webProjects = overviews.map(slide => data.dimensions.projects.find(project => project.id === slide.projectId)!);

function Stack({ project }: { project: Project }) {
  const labels = project.id === 'P004' ? getDesignFocusByProject(project.id) : getFeaturedTechnologiesByProject(data,project.id).map(tech => tech.label);
  return <div className="web-stack">{labels.map(label => <span key={label}>{label}</span>)}</div>;
}

function ProjectMetrics({ project }: { project: Project }) {
  const records = data.facts.metricRecords.filter(record=>record.projectId===project.id);
  if(!records.length) return null;
  return <div className="web-metrics">{records.map(record=>{
    const definition=data.dimensions.metrics.find(metric=>metric.id===record.metricId)!;
    const category={SCALE:'데이터 규모',CONFIGURATION:'설정',STRUCTURE:'구조',VALIDATION_CONTEXT:'비교 문제'}[definition.category];
    return <div key={record.id}><small>{category}</small><strong>{record.numericValue.toLocaleString('ko-KR')}<span>{definition.unit}</span></strong><h3>{definition.label}</h3><p>{record.context}</p></div>;
  })}</div>;
}

function SiteHeader() {
  const [open,setOpen]=useState(false);
  const location=useLocation();
  useEffect(()=>setOpen(false),[location]);
  useEffect(()=>{
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);
  },[]);
  return <header className="web-header"><div className="web-wrap web-header-inner"><Link className="web-brand" to="/">LEE WONJUN<span>DATA ENGINEER</span></Link><button type="button" className="web-menu" aria-expanded={open} aria-controls="web-navigation" onClick={()=>setOpen(!open)}>{open?'닫기 ×':'메뉴 ☰'}</button><nav id="web-navigation" className={open?'is-open':''} aria-label="주 메뉴"><Link to={{pathname:'/',hash:'#projects'}}>Projects</Link><Link to={{pathname:'/',hash:'#about'}}>About</Link><Link to={{pathname:'/',hash:'#contact'}}>Contact</Link><Link className="web-deck-link" to="/deck">슬라이드로 보기 <span>↗</span></Link></nav></div></header>;
}

export function WebLayout() {
  const location=useLocation();
  const navigate=useNavigate();
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    const oldSlide=deckSlides.find(slide=>slide.id===params.get('slide'));
    if(location.pathname==='/' && oldSlide?.projectId){
      const project=data.dimensions.projects.find(project=>project.id===oldSlide.projectId)!;
      const work=data.facts.contributions.find(work=>work.id===oldSlide.contributionIds[0]);
      navigate(`/projects/${project.slug}${work?`?section=${work.sectionAnchor}`:''}`,{replace:true});return;
    }
    if(location.pathname==='/' && location.hash){
      const frame=requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
      return()=>cancelAnimationFrame(frame);
    }
    if(!new URLSearchParams(location.search).has('section')) window.scrollTo({top:0,behavior:'instant'});
  },[location.pathname,location.search,location.hash,location.key]);
  return <div className="web-shell"><SiteHeader/><Outlet/><footer className="web-footer"><div className="web-wrap"><span>© {data.meta.lastUpdated.slice(0,4)} {data.profile.nameEn}</span><span>DATA ENGINEERING PORTFOLIO</span><Link to="/deck">슬라이드 덱 ↗</Link></div></footer></div>;
}

export function WebHome() {
  useEffect(()=>{document.title=data.meta.portfolioTitle;},[]);
  return <main>
    <section className="web-hero web-wrap"><div className="web-hero-copy"><p className="web-eyebrow">{data.profile.eyebrow}</p><p className="web-hero-name">{data.profile.nameKo} <span>/ {data.profile.role}</span></p><h1>{data.presentation.coverTitle.split('\n').map(line=><span key={line}>{line}</span>)}</h1><div className="web-rule"/><Bullets text={data.profile.intro}/><Link className="web-button" to={{pathname:'/',hash:'#projects'}}>프로젝트 살펴보기 <span>↓</span></Link></div><div className="web-hero-index"><div className="web-index-heading"><span>SELECTED WORK</span><span>01 — 04</span></div>{webProjects.map((project,index)=><Link to={`/projects/${project.slug}`} key={project.id}><span className="web-project-number">{slideNumber(index)}</span><div><small>{overviews[index].eyebrow.split(' / ')[1]}</small><h2>{project.name}</h2></div><span>↗</span></Link>)}<div className="web-index-footer"><span>Java · Python · SQL</span><span>{data.meta.lastUpdated.slice(0,7).replace('-','. ')}</span></div></div></section>

    <section className="web-section web-wrap" id="projects"><div className="web-section-heading"><div><p className="web-eyebrow">01 / SELECTED PROJECTS</p><h2>설계하고 구현한 작업</h2></div><p>데이터 통합 · Backend · 경로 탐색 · 개념 설계</p></div><div className="web-project-grid">{webProjects.map((project,index)=><article className="web-project-card" key={project.id}><div className="web-card-meta"><span>{slideNumber(index)} / {overviews[index].eyebrow.split(' / ')[1]}</span><span>{project.periodStart} — {project.periodEnd}</span></div><Link className="web-project-title" to={`/projects/${project.slug}`}><h3>{project.name}</h3><span>↗</span></Link><Bullets text={project.summary}/><Stack project={project}/><div className="web-card-bottom"><span>{project.kind}</span><Link to={`/projects/${project.slug}`}>작업 자세히 보기 →</Link></div></article>)}</div></section>

    <section className="web-about" id="about"><div className="web-wrap"><div className="web-section-heading"><div><p className="web-eyebrow">02 / BACKGROUND & SKILLS</p><h2>배경과 사용 기술</h2></div><span>{data.profile.nameKo} / {data.profile.nameEn}</span></div><div className="web-about-grid"><div className="web-about-education"><h3>Education & Training</h3>{data.profile.education.map(item=><div key={item.institution}><strong>{item.institution}</strong><p>{item.major} · {item.degree}</p></div>)}{data.profile.training.map(item=><div key={item.institution}><strong>{item.institution}</strong><p>{item.track} · {item.display}</p></div>)}<h3>Certificates</h3><p className="web-certificates">{data.profile.certifications.join(' · ')}</p></div><div className="web-about-tools">{['Java / Backend','Python / Data','SQL / Database','Optimization','Interface / Tools'].map(group=><div key={group}><h3>{group}</h3><p>{data.dimensions.technologies.filter(tech=>tech.group===group && data.bridges.contributionTechnology.some(link=>link.technologyId===tech.id)).map(tech=>tech.label).join(' · ')}</p></div>)}</div></div></div></section>

    <section className="web-contact" id="contact"><div className="web-wrap"><div><p className="web-eyebrow">03 / CONTACT</p><h2>{data.presentation.closingTitle.split('\n').map(line=><span key={line}>{line}</span>)}</h2></div><div className="web-contact-links"><span>{data.profile.nameKo} / {data.profile.nameEn}</span><a href={`mailto:${data.profile.contact.email}`}>{data.profile.contact.email}<span>↗</span></a><a href={`tel:${data.profile.contact.phone}`}>{data.profile.contact.phone}</a><Link to="/deck">슬라이드로 프로젝트 보기 <span>↗</span></Link></div></div></section>
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
  if(!project) return <WebNotFound/>;
  const goTo=(id:string)=>{setSelected(id);document.getElementById(id)?.scrollIntoView({behavior:'smooth'});};
  return <main className="web-project-page"><div className="web-wrap"><nav className="web-breadcrumb" aria-label="현재 위치"><Link to={{pathname:'/',hash:'#projects'}}>Projects</Link><span>/</span><span>{slideNumber(index)} · {project.name}</span></nav><header className="web-project-hero"><div><p className="web-eyebrow">{overview?.eyebrow}</p><h1>{project.name}</h1><p className="web-project-english">{project.nameEn}</p><Bullets text={project.summary}/><Stack project={project}/><dl className="web-project-facts"><div><dt>ROLE</dt><dd>{project.role}</dd></div><div><dt>PERIOD</dt><dd>{project.periodStart} — {project.periodEnd}</dd></div><div><dt>CONTEXT</dt><dd>{project.kind}</dd></div></dl></div>{diagram && <DeckDiagram diagram={diagram}/>}</header><ProjectMetrics project={project}/><div className="web-detail-layout"><aside className="web-project-nav"><p>ON THIS PROJECT</p>{groups.map((group,index)=><button type="button" key={group.id} className={selected===group.id?'is-active':''} onClick={()=>goTo(group.id)}><span>{slideNumber(index)}</span>{group.title}</button>)}<Link to={`/deck?slide=${overview?.id}`}>이 프로젝트를 슬라이드로 ↗</Link></aside><div className="web-project-work">{groups.map((group,index)=>{
    const work=group.contributionIds.map(id=>data.facts.contributions.find(work=>work.id===id)!);
    const visual=data.diagrams.find(diagram=>diagram.id===group.diagramId);
    return <section className="web-work-section" id={group.id} key={group.id}><div className="web-work-heading"><p className="web-eyebrow">{slideNumber(index)} / {group.eyebrow.split(' / ')[1]}</p><h2>{group.title}</h2></div><div className="web-work-grid">{work.map(item=><WorkCard work={item} key={item.id}/>)}</div>{visual && <DeckDiagram diagram={visual}/>}</section>;
  })}</div></div><nav className="web-project-pagination" aria-label="다른 프로젝트"><Link to={`/projects/${webProjects[(index+webProjects.length-1)%webProjects.length].slug}`}><small>← PREVIOUS PROJECT</small><strong>{webProjects[(index+webProjects.length-1)%webProjects.length].name}</strong></Link><Link to={`/projects/${webProjects[(index+1)%webProjects.length].slug}`}><small>NEXT PROJECT →</small><strong>{webProjects[(index+1)%webProjects.length].name}</strong></Link></nav></div></main>;
}

export function WebNotFound(){return <main className="web-wrap web-not-found"><p className="web-eyebrow">404 / NOT FOUND</p><h1>페이지를 찾을 수 없습니다.</h1><Link className="web-button" to="/">포트폴리오로 돌아가기 ↗</Link></main>;}
