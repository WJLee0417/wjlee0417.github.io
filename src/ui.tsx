import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { data, categoryLabel, displayCopy, getEvidenceByContribution, type Contribution, type EvidenceVerificationStatus, type Project, type Technology } from './data';

const nav = [
  ['about', 'About'], ['projects', 'Projects'], ['explore', 'Explore'], ['contact', 'Contact'],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  const location = useLocation();
  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open]);
  useEffect(() => {
    if (location.pathname !== '/') return;
    const observer = new IntersectionObserver((entries) => {
      for (const item of entries) if (item.isIntersecting) setActive(item.target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    nav.forEach(([id]) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [location.pathname]);
  return <header className="site-header">
    <div className="wrap header-inner">
      <Link to={{ pathname: "/", hash: "#home" }} className="wordmark" aria-label="LEE WONJUN, 홈으로 이동"><strong>LEE WONJUN</strong><span>/ DATA ENGINEER</span></Link>
      <nav id="mobile-menu" className={open ? 'header-nav open' : 'header-nav'} aria-label="주 메뉴">
        {nav.map(([id, label]) => <Link key={id} onClick={() => setOpen(false)} className={active === id && location.pathname === '/' ? 'active' : ''} to={{ pathname: "/", hash: `#${id}` }}>{label}</Link>)}
      </nav>
      <button className="menu-toggle" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? '닫기' : '메뉴'}<span aria-hidden="true">{open ? '×' : '☰'}</span></button>
    </div>
  </header>;
}

export function Footer() {
  const [top, setTop] = useState(false);
  useEffect(() => {
    const update = () => setTop(window.scrollY > 600);
    window.addEventListener('scroll', update, { passive: true }); update();
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <footer className="site-footer"><div className="wrap footer-inner"><span>© {data.meta.lastUpdated.slice(0, 4)} {data.profile.nameEn}</span><span>Updated {data.meta.lastUpdated.slice(0, 7)}</span></div>{top && <button className="back-to-top" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>맨 위로 ↑</button>}</footer>;
}

export function SectionHeading({ number, eyebrow, title, description }: { number: string; eyebrow: string; title: string; description?: string }) {
  return <div className="section-heading"><p className="section-kicker"><span>{number}</span> / {eyebrow}</p><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

export function CategoryTag({ category }: { category: string }) { return <span className="category-tag">{categoryLabel[category] ?? category}</span>; }

export function EvidenceTag({ status }: { status: EvidenceVerificationStatus }) {
  const labels: Record<EvidenceVerificationStatus, string> = {
    SOURCE_SUPPORTED: '소스 자료로 기록',
    USER_CONFIRMED: '본인 확인 경험',
    REVIEW_REQUIRED: '추가 확인 필요',
    RECONSTRUCTED_DESIGN: '재구성 설계',
  };
  return <span className={`evidence-tag ${status.toLowerCase()}`}>{labels[status]}</span>;
}

export function ProjectScope({ project, sourceNote }: { project: Project; sourceNote?: string }) {
  if (!project.provenanceNote && !project.scopeNotes?.length && !sourceNote) return null;
  return <details className="project-scope contextual-detail">
    <summary>담당 범위·자료 출처 <span aria-hidden="true">+</span></summary>
    <div>
      {project.provenanceNote && <p className="provenance-note">{project.provenanceNote}</p>}
      {project.scopeNotes && <ul>{project.scopeNotes.map(note => <li key={note}>{note}</li>)}</ul>}
      {sourceNote && <p>{sourceNote}</p>}
    </div>
  </details>;
}

export function ContributionContext({ contribution }: { contribution: Contribution }) {
  if (!contribution.verification && !contribution.publicNote) return null;
  return <details className="claim-context contextual-detail">
    <summary>검증·추가 설명 <span aria-hidden="true">+</span></summary>
    <div>
      <EvidenceTag status={contribution.origin === 'RECONSTRUCTED_DESIGN' ? 'RECONSTRUCTED_DESIGN' : contribution.evidenceStatus}/>
      {contribution.verification && <p><strong>검증 범위</strong>{contribution.verification}</p>}
      {contribution.publicNote && <p>{contribution.publicNote}</p>}
    </div>
  </details>;
}

export function evidenceLinkLabel(evidence: (typeof data.dimensions.evidence)[number]) {
  if (evidence.verificationStatus === 'RECONSTRUCTED_DESIGN') return '재구성 설계';
  return evidence.kind === 'SOURCE' ? '코드·문서' : evidence.kind === 'DESIGN' ? '설계 자료' : '관련 자료';
}

export function EvidenceLinks({ contributionId }: { contributionId: string }) {
  const items = getEvidenceByContribution(data, contributionId).filter(e => e.url || e.publicAssetPath);
  if (!items.length) return null;
  return <ul className="work-artifacts" aria-label="연결된 작업 산출물">
    {items.map(e => <li key={e.id}><a href={e.url || e.publicAssetPath!} target="_blank" rel="noreferrer">
      <small>{evidenceLinkLabel(e)}</small><span>{e.label} ↗</span>
    </a></li>)}
  </ul>;
}

export function TechnologyTags({ technologies }: { technologies: Technology[] }) {
  return <div className="technology-tags">{technologies.map(t => <span key={t.id} title={`${t.label} · ${t.category}`}>{t.label}</span>)}</div>;
}

export function MetricList({ projectId }: { projectId: string }) {
  const records = data.facts.metricRecords.filter(x => x.projectId === projectId);
  if (!records.length) return null;
  return <div className="metric-list">{records.map(r => {
    const metric = data.dimensions.metrics.find(m => m.id === r.metricId)!;
    return <div className="metric-item" key={r.id}><div><CategoryTag category={metric.category} /><strong>{r.numericValue.toLocaleString('ko-KR')}<small>{metric.unit}</small></strong></div><p>{metric.label}</p><span>{displayCopy(r.context)}</span><details className="metric-context contextual-detail"><summary>자료 출처 <span aria-hidden="true">+</span></summary><div><EvidenceTag status={r.evidenceStatus}/></div></details></div>;
  })}</div>;
}
