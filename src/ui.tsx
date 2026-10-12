import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { data, categoryLabel, displayCopy, type Technology } from './data';

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

export function TechnologyTags({ technologies }: { technologies: Technology[] }) {
  return <div className="technology-tags">{technologies.map(t => <span key={t.id} title={`${t.label} · ${t.category}`}>{t.label}</span>)}</div>;
}

export function MetricList({ projectId }: { projectId: string }) {
  const records = data.facts.metricRecords.filter(x => x.projectId === projectId);
  if (!records.length) return null;
  return <div className="metric-list">{records.map(r => {
    const metric = data.dimensions.metrics.find(m => m.id === r.metricId)!;
    return <div className="metric-item" key={r.id}><div><CategoryTag category={metric.category} /><strong>{r.numericValue.toLocaleString('ko-KR')}<small>{metric.unit}</small></strong></div><p>{metric.label}</p><span>{displayCopy(r.context)}</span></div>;
  })}</div>;
}
