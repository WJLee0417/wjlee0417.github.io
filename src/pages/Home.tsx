import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { data, getAlgorithmsByProject, getCapabilitiesByProject, getDesignFocusByProject, getFeaturedTechnologiesByProject, getProjectsByTechnology, getTechnologyGroups, projectPath, sortTechnologies } from '../data';
import { SectionHeading, CategoryTag, TechnologyTags } from '../ui';

function ProjectMark({ index }: { index: number }) {
  return <svg className="project-mark" viewBox="0 0 160 90" fill="none" aria-hidden="true">
    {index === 0 && <><path d="M14 18h40v20h32v31h61"/><path d="M14 68h40V38"/><circle cx="14" cy="18" r="5"/><circle cx="14" cy="68" r="5"/><circle cx="86" cy="38" r="5"/><circle cx="147" cy="69" r="5"/></>}
    {index === 1 && <><path d="M12 67 45 28l28 27 26-38 48 33"/><path d="M12 67h135"/><circle cx="12" cy="67" r="5"/><circle cx="45" cy="28" r="5"/><circle cx="73" cy="55" r="5"/><circle cx="99" cy="17" r="5"/><circle cx="147" cy="50" r="5"/></>}
    {index === 2 && <><rect x="13" y="22" width="26" height="45" rx="4"/><rect x="67" y="22" width="26" height="45" rx="4"/><rect x="121" y="22" width="26" height="45" rx="4"/><path d="M39 44h28m26 0h28"/></>}
    {index === 3 && <><rect x="16" y="14" width="128" height="61" rx="7"/><path d="M16 34h128M48 34v41m32-41v41m32-41v41"/><circle cx="32" cy="55" r="5"/><circle cx="64" cy="55" r="5"/><circle cx="96" cy="55" r="5"/><circle cx="128" cy="55" r="5"/></>}
  </svg>;
}

function ProjectStack({ projectId }: { projectId: string }) {
  if (projectId === 'P004') return <div className="card-stack"><small>DESIGN FOCUS</small><div className="technology-tags design-tags">{getDesignFocusByProject(projectId).map(label => <span key={label}>{label}</span>)}</div></div>;
  const algorithms = getAlgorithmsByProject(projectId);
  return <div className="card-stack"><small>TECH STACK</small><TechnologyTags technologies={getFeaturedTechnologiesByProject(data, projectId)}/>{algorithms.length > 0 && <p className="algorithm-note">ALGORITHMS · {algorithms.join(' · ')}</p>}</div>;
}

function About() {
  const groups = getTechnologyGroups(data).map(group => {
    const technologies = sortTechnologies(data.dimensions.technologies.filter(t => t.group === group.label && getProjectsByTechnology(data, t.id).length > 0));
    return { label: group.label, technologies };
  });
  return <section className="section wrap about-section" id="about">
    <SectionHeading number="01" eyebrow="ABOUT & EXPERIENCE" title="배경과 학습" />
    <div className="about-grid">
      <div><h3>Education & Training</h3>{data.profile.education.map(x => <div className="about-row" key={x.institution}><strong>{x.institution}</strong><span>{x.major} · {x.degree}</span></div>)}{data.profile.training.map(x => <div className="about-row" key={x.institution}><strong>{x.institution}</strong><span>{x.track} · {x.display}</span></div>)}</div>
      <div><h3>Skills & Certificates</h3><div className="skill-groups">{groups.map(group => <div className="skill-group" key={group.label}><div className="skill-group-heading"><strong>{group.label}</strong></div><div className="skill-items">{group.technologies.map(t => <span key={t.id}>{t.label}</span>)}</div></div>)}</div><div className="about-row"><strong>자격</strong><span>{data.profile.certifications.join(' · ')}</span></div></div>
    </div>
  </section>;
}

export default function Home({ explorer }: { explorer: ReactNode }) {
  const projects = [...data.dimensions.projects].sort((a, b) => a.sortOrder - b.sortOrder);
  const contact = data.profile.contact;
  const hasContact = Boolean(contact.phone || contact.email || contact.resumeUrl || contact.githubUrl || contact.otherUrls.length);
  return <main>
    <section className="hero wrap" id="home"><div className="hero-copy"><p className="eyebrow">{data.profile.eyebrow}</p><p className="hero-name">{data.profile.nameKo} <span>/ {data.profile.role}</span></p><h1>{data.profile.headline}</h1><div className="hero-actions"><Link className="button primary" to={{ pathname: "/", hash: "#projects" }}>프로젝트 살펴보기 <span aria-hidden="true">↗</span></Link><Link className="button secondary" to={{ pathname: "/", hash: "#explore" }}>역량 관계 탐색하기 <span aria-hidden="true">→</span></Link></div></div></section>

    <About/>

    <section className="section wrap" id="projects"><SectionHeading number="02" eyebrow="SELECTED WORK" title="문제를 어떻게 정의하고 해결했는지" description="프로젝트별 문제, 맡은 역할, 설계와 결과를 살펴보세요." /><div className="project-grid">{projects.map((p, index) => <Link className="project-card" to={projectPath(p.slug)} key={p.id}><div className="card-top"><span>{String(index + 1).padStart(2, '0')} / 04</span><span>{p.periodStart} — {p.periodEnd}</span></div><ProjectMark index={index} /><p className="card-en">{p.nameEn}</p><h3>{p.name}</h3><p className="card-summary">{p.summary}</p><div className="card-capabilities">{getCapabilitiesByProject(data, p.id).slice(0, 2).map(c => <span key={c.id}>{c.label}</span>)}</div><ProjectStack projectId={p.id}/><div className="card-bottom"><span>{p.id === 'P002' ? '제약 기반 경로 최적화' : <><CategoryTag category={p.cardLabelKind} /> {p.cardLabel}</>}</span><strong>사례 보기 <span aria-hidden="true">↗</span></strong></div></Link>)}</div></section>

    <section className="section explore-section" id="explore"><div className="wrap"><SectionHeading number="03" eyebrow="EXPLORE THE MODEL" title="프로젝트에 적용한 역량과 기술" description="역량이나 기술을 선택해 관련 프로젝트와 작업을 살펴보세요." />{explorer}</div></section>

    <section className="section contact-section" id="contact"><div className="wrap"><SectionHeading number="04" eyebrow="CONTACT" title="경험을 더 자세히 이야기할 기회를 기다립니다." />{hasContact ? <div className="contact-links">{contact.phone && <span>{contact.phone}</span>}{contact.email && <span>{contact.email}</span>}{contact.resumeUrl && <a href={contact.resumeUrl}>이력서 ↗</a>}{contact.githubUrl && <a href={contact.githubUrl}>GitHub ↗</a>}{contact.otherUrls.map(url => <a key={url} href={url}>{url} ↗</a>)}</div> : <p className="contact-empty">현재 공개 연락처는 제공되지 않았습니다.</p>}</div></section>
  </main>;
}
