import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { data, displayCopy, getCapabilityProjectEdges, getTechnologyProjectEdges, getTechnologyGroups, getContributionsByConnection, getContributionsByTechnologyProject, getMetricsByProject, getProjectsByCapability, getProjectsByTechnology, projectPath, sectionPath, sortTechnologies, type Contribution, type Technology } from '../data';
import { CategoryTag } from '../ui';

type Mode = 'capability' | 'technology';
const modeNames: Record<Mode, string> = { capability: 'Capability View', technology: 'Technology View' };
const capEdges = getCapabilityProjectEdges(data);
const techEdges = getTechnologyProjectEdges(data);
const projects = [...data.dimensions.projects].sort((a, b) => a.sortOrder - b.sortOrder);
const activeCapabilities = data.dimensions.capabilities.filter(c => capEdges.some(e => e.capabilityId === c.id));
const allTechnologies = sortTechnologies(data.dimensions.technologies.filter(t => techEdges.some(e => e.technologyId === t.id)));
const technologyGroups = getTechnologyGroups(data);

function Contributions({ items }: { items: Contribution[] }) {
  return <div className="contribution-list">{items.map(c => {
    const project = projects.find(p => p.id === c.projectId)!;
    return <details className="contribution-disclosure" key={c.id}><summary><span>{c.title}</span><span className="disclosure-plus" aria-hidden="true">+</span></summary><div className="contribution-body"><dl><dt>Problem</dt><dd>{c.problem}</dd><dt>Decision</dt><dd>{c.decision}</dd><dt>Action</dt><dd>{displayCopy(c.action)}</dd><dt>Outcome</dt><dd>{displayCopy(c.output)}</dd></dl><Link className="text-link" to={sectionPath(project.slug, c.sectionAnchor)}>{project.name} · 해당 섹션 보기 ↗</Link></div></details>;
  })}</div>;
}

function ExplorerDetail({ mode, selected }: { mode: Mode; selected: string }) {
  if (!selected) return <div className="detail-idle"><div className="detail-graphic" aria-hidden="true"><span/><span/><span/></div><p className="eyebrow">SELECT AN ITEM</p><h3>역량과 프로젝트를 연결해 보세요</h3><p>항목을 선택하면 관련 프로젝트와 작업을 보여드립니다.</p><small>키보드에서는 Tab으로 이동하고 Enter 또는 Space로 선택할 수 있습니다.</small></div>;
  const separator = selected.indexOf(':');
  const kind = selected.slice(0, separator);
  const id = selected.slice(separator + 1);
  if (kind === 'p') {
    const project = projects.find(p => p.id === id);
    if (!project) return null;
    const featured = project.featuredContributionIds.map(cid => data.facts.contributions.find(c => c.id === cid)!).filter(Boolean);
    const metrics = project.id === 'P001' ? getMetricsByProject(data, project.id) : [];
    return <><p className="eyebrow">PROJECT / {project.id}</p><h3>{project.name}</h3><p className="detail-lead">{project.summary}</p><div className="detail-keyline"><b>개인 역할</b><span>{project.role}</span></div><h4>대표 수행 작업</h4><Contributions items={featured} />{metrics.length > 0 && <><h4>정량 기록</h4>{metrics.map(m => <div className="detail-metric" key={m.id}><CategoryTag category={m.category}/><strong>{m.numericValue.toLocaleString('ko-KR')} {m.unit}</strong><span>{m.label} · {displayCopy(m.context)}</span></div>)}</>}<Link className="button primary panel-link" to={projectPath(project.slug)}>프로젝트 사례 보기 ↗</Link></>;
  }
  if (mode === 'capability') {
    if (kind === 'c') {
      const cap = data.dimensions.capabilities.find(c => c.id === id);
      if (!cap) return null;
      const linked = getProjectsByCapability(data, id);
      const items = data.facts.contributions.filter(c => c.capabilityId === id);
      return <><p className="eyebrow">CAPABILITY / {cap.id}</p><h3>{cap.label}</h3><p className="detail-lead">{cap.description}</p><h4>연결 프로젝트</h4>{linked.length ? <div className="linked-list">{linked.map(p => <Link key={p.id} to={projectPath(p.slug)}>{p.id} · {p.name} ↗</Link>)}</div> : <p className="empty-connection">연결된 프로젝트가 없습니다.</p>}{items.length > 0 && <><h4>관련 수행 작업</h4><Contributions items={items}/></>}</>;
    }
    if (kind === 'e') {
      const [capId, projectId] = id.split('::');
      const cap = data.dimensions.capabilities.find(c => c.id === capId);
      const project = projects.find(p => p.id === projectId);
      if (!cap || !project) return null;
      const items = getContributionsByConnection(data, projectId, capId);
      return <><p className="eyebrow">CONNECTION / {items.length} CONTRIBUTIONS</p><h3>{cap.label} × {project.name}</h3><p className="detail-lead">관련 작업</p><Contributions items={items}/></>;
    }
  }
  if (mode === 'technology') {
    if (kind === 't') {
      const tech = allTechnologies.find(t => t.id === id);
      if (!tech) return null;
      const linked = getProjectsByTechnology(data, id);
      return <><p className="eyebrow">TECHNOLOGY / {tech.id}</p><h3>{tech.label}</h3><p className="detail-lead">{tech.group} · {tech.category}</p><h4>적용 프로젝트</h4><div className="linked-list">{linked.map(p => <div key={p.id}><Link to={projectPath(p.slug)}>{p.id} · {p.name} ↗</Link><Contributions items={getContributionsByTechnologyProject(data, id, p.id)}/></div>)}</div></>;
    }
    if (kind === 'te') {
      const [techId, projectId] = id.split('::');
      const tech = allTechnologies.find(t => t.id === techId);
      const project = projects.find(p => p.id === projectId);
      if (!tech || !project) return null;
      return <><p className="eyebrow">TECHNOLOGY CONNECTION</p><h3>{tech.label} × {project.name}</h3><p className="detail-lead">관련 작업</p><Contributions items={getContributionsByTechnologyProject(data, techId, projectId)}/></>;
    }
  }
  return null;
}

function Network({ mode, selected, choose, technologies }: { mode: 'capability' | 'technology'; selected: string; choose: (value: string) => void; technologies: Technology[] }) {
  const isCapability = mode === 'capability';
  const nodes = isCapability ? activeCapabilities.map(c => ({ id: c.id, label: c.label, subtitle: c.id })) : technologies.map(t => ({ id: t.id, label: t.label, subtitle: t.category }));
  const edges = isCapability ? capEdges.map(e => ({ ...e, leftId: e.capabilityId })) : techEdges.map(e => ({ ...e, leftId: e.technologyId }));
  const visibleEdges = edges.filter(e => nodes.some(n => n.id === e.leftId));
  const nodeY = (index: number) => 56 + index * (540 / Math.max(nodes.length - 1, 1));
  const projectY = (index: number) => 100 + index * 145;
  const edgeSelectionPrefix = isCapability ? 'e' : 'te';
  const nodeSelectionPrefix = isCapability ? 'c' : 't';
  const selectedId = selected.split(':')[1];
  const isRelated = (edge: (typeof visibleEdges)[number]) => selected === `${nodeSelectionPrefix}:${edge.leftId}` || selected === `p:${edge.projectId}` || selected === `${edgeSelectionPrefix}:${edge.leftId}::${edge.projectId}`;
  return <div className="network-wrap">
    <div className="network-canvas" aria-label={`${modeNames[mode]} 관계도`}>
      <div className="network-col-label left">{isCapability ? 'CAPABILITIES' : 'TECHNOLOGIES'}</div><div className="network-col-label right">PROJECTS</div>
      <svg className="network-lines" viewBox="0 0 760 650" preserveAspectRatio="none" aria-label="관계 연결선">{visibleEdges.map(e => { const i = nodes.findIndex(n => n.id === e.leftId); const p = projects.findIndex(x => x.id === e.projectId); const y1 = nodeY(i); const y2 = projectY(p); const d = `M 200 ${y1} C 340 ${y1}, 420 ${y2}, 540 ${y2}`; const label = `${nodes[i].label}와 ${projects[p].name}의 관계`; const value = `${edgeSelectionPrefix}:${e.leftId}::${e.projectId}`; return <g key={e.id}><path d={d} className={selected ? isRelated(e) ? 'line selected' : 'line muted' : 'line'} /><path d={d} className="line-hit" role="button" tabIndex={0} aria-label={label} onClick={() => choose(value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(value); } }} /></g>; })}</svg>
      {nodes.map((n, i) => <button key={n.id} className={`network-node left-node ${selected === `${nodeSelectionPrefix}:${n.id}` ? 'selected' : ''} ${selected && selectedId !== n.id && !visibleEdges.some(e => e.leftId === n.id && isRelated(e)) ? 'muted' : ''}`} style={{ top: `${nodeY(i) / 650 * 100}%` }} onClick={() => choose(`${nodeSelectionPrefix}:${n.id}`)}><span>{n.subtitle}</span><strong>{n.label}</strong></button>)}
      {projects.map((p, i) => <button key={p.id} className={`network-node right-node ${selected === `p:${p.id}` ? 'selected' : ''} ${!isCapability && selected.startsWith('t:') && visibleEdges.some(e => e.projectId === p.id && isRelated(e)) ? 'related' : ''} ${selected && selectedId !== p.id && !visibleEdges.some(e => e.projectId === p.id && isRelated(e)) ? 'muted' : ''}`} style={{ top: `${projectY(i) / 650 * 100}%` }} onClick={() => choose(`p:${p.id}`)}><span>{p.id}</span><strong>{p.name}</strong></button>)}
      <div className="network-axis left-axis"/><div className="network-axis right-axis"/>
    </div>
    <div className="edge-index"><p>프로젝트 연결 <span>{visibleEdges.length} relationships</span></p><div>{visibleEdges.map(e => { const node = nodes.find(n => n.id === e.leftId)!; const project = projects.find(p => p.id === e.projectId)!; const value = `${edgeSelectionPrefix}:${e.leftId}::${e.projectId}`; return <button className={selected === value ? 'active' : ''} key={e.id} onClick={() => choose(value)}>{node.label} <span>↔</span> {project.name}<small>{e.contributionIds.length}건</small></button>; })}</div></div>
  </div>;
}

export default function Explorer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawMode = params.get('mode');
  const mode: Mode = rawMode === 'technology' ? 'technology' : 'capability';
  const selected = params.get('select') ?? '';
  const rawGroup = params.get('group');
  const selectedGroup: Technology['group'] | 'all' = mode === 'technology' && technologyGroups.some(g => g.label === rawGroup) ? rawGroup as Technology['group'] : 'all';
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const baseSearch = `?mode=${mode}${mode === 'technology' && selectedGroup !== 'all' ? `&group=${encodeURIComponent(selectedGroup)}` : ''}`;
  const choose = (value: string) => navigate({ pathname: '/', search: `${baseSearch}${selected === value ? '' : `&select=${encodeURIComponent(value)}`}`, hash: '#explore' }, { preventScrollReset: true });
  const changeMode = (next: Mode) => { setSearch(''); setExpanded(false); navigate({ pathname: '/', search: `?mode=${next}`, hash: '#explore' }, { preventScrollReset: true }); };
  const changeGroup = (group: Technology['group'] | 'all') => { setSearch(''); setExpanded(false); navigate({ pathname: '/', search: `?mode=technology${group === 'all' ? '' : `&group=${encodeURIComponent(group)}`}`, hash: '#explore' }, { preventScrollReset: true }); };
  const reset = () => navigate({ pathname: '/', search: baseSearch, hash: '#explore' }, { preventScrollReset: true });
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && selected) reset(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [selected, mode]);
  useEffect(() => {
    if (selected && window.innerWidth < 1024) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected]);
  const filteredTechnologies = useMemo(() => allTechnologies.filter(t => (selectedGroup === 'all' || t.group === selectedGroup) && t.label.toLowerCase().includes(search.toLowerCase())), [selectedGroup, search]);
  const visibleTechnologies = expanded || search || selectedGroup !== 'all' ? filteredTechnologies : filteredTechnologies.filter((t, i) => i < 8 || selected.includes(t.id));
  const filteredCount = filteredTechnologies.length;
  const selectedTechId = mode === 'technology' && selected.startsWith('t:') ? selected.slice(2) : null;
  const relatedProjectIds = new Set(techEdges.filter(e => e.technologyId === selectedTechId).map(e => e.projectId));
  return <div className="explorer"><div className="explorer-toolbar"><div className="segmented" role="group" aria-label="탐색 모드">{(['capability', 'technology'] as const).map(m => <button key={m} className={mode === m ? 'active' : ''} aria-pressed={mode === m} onClick={() => changeMode(m)}>{modeNames[m]}</button>)}</div><button className="reset-button" onClick={reset}>전체 관계 보기 <span aria-hidden="true">↗</span></button></div>{mode === 'technology' && <div className="tech-controls"><label htmlFor="technology-search">기술 검색</label><input id="technology-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="기술 이름 검색" type="search"/><span>{filteredCount}개 연결 기술</span>{selectedGroup === 'all' && !expanded && !search && filteredCount > 8 && <button onClick={() => setExpanded(true)}>더 보기 +</button>}<div className="tech-groups" role="group" aria-label="기술 그룹"><button className={selectedGroup === 'all' ? 'active' : ''} aria-pressed={selectedGroup === 'all'} onClick={() => changeGroup('all')}>전체</button>{technologyGroups.map(group => <button key={group.label} className={selectedGroup === group.label ? 'active' : ''} aria-pressed={selectedGroup === group.label} onClick={() => changeGroup(group.label)}>{group.label}</button>)}</div></div>}
    <div className="explorer-body"><div className="explorer-main"><><div className="desktop-network"><Network mode={mode} selected={selected} choose={choose} technologies={visibleTechnologies}/></div><div className="mobile-network"><p className="mobile-explore-hint">항목을 선택한 뒤 연결된 프로젝트와 수행 작업을 확인하세요.</p><div className="mobile-choice-list">{(mode === 'capability' ? data.dimensions.capabilities.map(c => ({id:c.id,label:c.label,subtitle:c.id})) : filteredTechnologies.map(t => ({id:t.id,label:t.label,subtitle:t.category}))).map(n => <button key={n.id} className={selected === `${mode === 'capability' ? 'c' : 't'}:${n.id}` ? 'selected' : ''} onClick={() => choose(`${mode === 'capability' ? 'c' : 't'}:${n.id}`)}><small>{n.subtitle}</small>{n.label}</button>)}</div><div className="mobile-project-list"><h3>프로젝트</h3>{projects.map(p => <button key={p.id} className={selected === `p:${p.id}` ? 'selected' : relatedProjectIds.has(p.id) ? 'related' : ''} onClick={() => choose(`p:${p.id}`)}>{p.id} · {p.name}</button>)}</div><div className="mobile-edge-list"><h3>프로젝트 연결</h3>{(mode === 'capability' ? capEdges.map(e => ({...e,leftId:e.capabilityId})) : techEdges.map(e => ({...e,leftId:e.technologyId}))).filter(e => mode === 'capability' || filteredTechnologies.some(t => t.id === e.leftId)).map(e => { const label = mode === 'capability' ? data.dimensions.capabilities.find(c => c.id === e.leftId)?.label : allTechnologies.find(t => t.id === e.leftId)?.label; const project = projects.find(p => p.id === e.projectId)!; const value = `${mode === 'capability' ? 'e' : 'te'}:${e.leftId}::${e.projectId}`; return <button className={selected === value ? 'selected' : ''} key={e.id} onClick={() => choose(value)}>{label} ↔ {project.name}</button>; })}</div></div>{mode === 'capability' && <details className="all-capabilities"><summary>전체 역량 분류 보기 · 8개</summary><div>{data.dimensions.capabilities.map(c => <button key={c.id} onClick={() => choose(`c:${c.id}`)}>{c.id} · {c.label}{c.noConfirmedContribution && <span>연결된 프로젝트 없음</span>}</button>)}</div></details>}</></div><aside ref={detailRef} className="explorer-detail" aria-live="polite"><ExplorerDetail mode={mode} selected={selected}/></aside></div>
  </div>;
}
