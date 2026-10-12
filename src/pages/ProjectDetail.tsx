import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  data, displayCopy, getAlgorithmsByProject, getCapabilitiesByProject, getContributionsByProject,
  getDesignFocusByProject, getDetailTechnologiesByProject, getFeaturedTechnologiesByProject,
  getTechnologiesByContribution, projectPath,
} from '../data';
import { MetricList, TechnologyTags } from '../ui';
import DiagramFrame from './Diagrams';

export default function ProjectDetail() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const project = data.dimensions.projects.find(p => p.slug === slug);
  const section = params.get('section');

  useEffect(() => {
    if (!section) return;
    const timer = window.setTimeout(() => document.getElementById(section)?.scrollIntoView(), 80);
    return () => window.clearTimeout(timer);
  }, [slug, section]);

  useEffect(() => {
    document.title = project ? `${project.name} · ${data.profile.nameEn}` : '페이지를 찾을 수 없습니다.';
    return () => { document.title = data.meta.portfolioTitle; };
  }, [project]);

  if (!project) return <main className="wrap missing">
    <p className="eyebrow">404 / PROJECT</p>
    <h1>프로젝트를 찾을 수 없습니다.</h1>
    <Link className="text-link" to={{ pathname: '/', hash: '#projects' }}>프로젝트 목록으로 ↗</Link>
  </main>;

  const sections = data.pages[project.id].sections.filter(s => s.id !== 'evidence');
  const contributions = getContributionsByProject(data, project.id);
  const diagrams = data.diagrams.filter(d => d.projectId === project.id);
  const ordered = [...data.dimensions.projects].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex(p => p.id === project.id);
  const featured = project.featuredContributionIds.map(id => contributions.find(c => c.id === id)).filter(Boolean);
  const featuredTechnologies = getFeaturedTechnologiesByProject(data, project.id);
  const detailTechnologies = getDetailTechnologiesByProject(data, project.id);
  const algorithms = getAlgorithmsByProject(project.id);
  const designFocus = getDesignFocusByProject(project.id);
  const sectionTitle = (id: string, title: string) => id === 'api-evidence' ? 'Persistence & API' : title;

  return <main className="project-page"><div className="wrap">
    <nav className="breadcrumb" aria-label="현재 위치">
      <Link to={{ pathname: '/', hash: '#projects' }}>Projects</Link><span>/</span><span>{project.id}</span>
    </nav>

    <div className="project-hero">
      <div>
        <p className="eyebrow">CASE STUDY / {project.id}</p>
        <h1>{project.name}</h1>
        <p className="project-en">{project.nameEn}</p>
        <p className="project-summary">{project.summary}</p>
        <div className="project-hero-tags">{getCapabilitiesByProject(data, project.id).map(c => <span key={c.id}>{c.label}</span>)}</div>
        <div className="project-stack">
          <small>{designFocus.length ? 'DESIGN FOCUS' : 'TECH STACK'}</small>
          {designFocus.length ? <div className="technology-tags design-tags">{designFocus.map(label => <span key={label}>{label}</span>)}</div> : <TechnologyTags technologies={featuredTechnologies}/>}
          {detailTechnologies.length > 0 && <div className="stack-detail"><span>MORE</span><TechnologyTags technologies={detailTechnologies}/></div>}
          {algorithms.length > 0 && <p className="algorithm-note">ALGORITHMS · {algorithms.join(' · ')}</p>}
        </div>
      </div>
      <div className="project-meta">
        <div><span>ROLE</span><strong>{project.role}</strong></div>
        <div><span>PERIOD</span><strong>{project.periodStart} — {project.periodEnd}</strong></div>
        <div><span>CONTEXT</span><strong>{project.kind}</strong></div>
      </div>
    </div>

    <div className="project-summary-grid">
      <div><span>01 / PROBLEM</span><p>{project.problemSummary}</p></div>
      <div><span>02 / DECISION</span><p>{featured[0]?.decision}</p></div>
      <div><span>03 / ACTION</span><p>{featured[0]?.action}</p></div>
      <div><span>04 / OUTCOME</span><p>{displayCopy(project.outcomeSummary)}</p></div>
    </div>

    <div className="project-content">
      <aside className="project-toc"><p>ON THIS PAGE</p>
        {sections.map((s, i) => <Link to={`?section=${s.id}`} key={s.id}><span>{String(i + 1).padStart(2, '0')}</span>{sectionTitle(s.id, s.title)}</Link>)}
        <Link className="toc-back" to={{ pathname: '/', hash: '#projects' }}>← 프로젝트 목록</Link>
      </aside>
      <div className="project-article">
        {sections.map((s, i) => {
          const current = contributions.filter(c => c.sectionAnchor === s.id);
          const currentDiagrams = diagrams.filter(d => d.sectionAnchor === s.id);
          return <section className="article-section" id={s.id} key={s.id}>
            <div className="article-section-heading">
              <span>{String(i + 1).padStart(2, '0')} / {project.id}</span>
              <h2>{sectionTitle(s.id, s.title)}</h2>
              <p>{displayCopy(s.body)}</p>
            </div>
            {i === 0 && <>
              <div className="overview-brief">
                <div><small>ROLE</small><strong>{project.role}</strong></div>
                <div><small>RESULT</small><strong>{displayCopy(project.outcomeSummary)}</strong></div>
              </div>
              {project.id === 'P001' && <MetricList projectId={project.id}/>}
            </>}
            {currentDiagrams.map(d => <DiagramFrame diagram={d} sectionDescription={displayCopy(s.body)} key={d.id}/>)}
            {current.length > 0 && <div className="section-contributions">
              <h3>개인 수행 작업 <span>{current.length}</span></h3>
              {current.map(c => <article className="work-entry" key={c.id}>
                <h4>{c.title}</h4>
                <div className="work-entry-flow">
                  <div><b>문제</b><p>{c.problem}</p></div>
                  <div><b>판단</b><p>{c.decision}</p></div>
                  <div><b>수행</b><p>{displayCopy(c.action)}</p></div>
                  <div><b>결과</b><p>{displayCopy(c.output)}</p></div>
                </div>
                {getTechnologiesByContribution(data, c.id).length > 0 && <details className="technical-detail">
                  <summary>기술 내용 더 보기 <span aria-hidden="true">+</span></summary>
                  <div>
                    <p><strong>사용 기술</strong> {getTechnologiesByContribution(data, c.id).map(t => t.label).join(' · ')}</p>
                  </div>
                </details>}
              </article>)}
            </div>}
          </section>;
        })}
      </div>
    </div>

    <nav className="project-pagination" aria-label="프로젝트 이동">
      <Link to={projectPath(ordered[(index + ordered.length - 1) % ordered.length].slug)}><span>← PREVIOUS</span><strong>{ordered[(index + ordered.length - 1) % ordered.length].name}</strong></Link>
      <Link to={projectPath(ordered[(index + 1) % ordered.length].slug)}><span>NEXT →</span><strong>{ordered[(index + 1) % ordered.length].name}</strong></Link>
    </nav>
  </div></main>;
}
