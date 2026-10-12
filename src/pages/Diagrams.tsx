import { useState } from 'react';
import type { Diagram } from '../data';

function OptionButtons({ labels, active, onChange }: { labels: string[]; active: number; onChange: (i: number) => void }) {
  return <div className="diagram-options" role="group" aria-label="도식 단계 선택">{labels.map((label, i) => <button key={`${label}-${i}`} aria-pressed={active === i} className={active === i ? 'selected' : ''} onClick={() => onChange(i)}>{String(i + 1).padStart(2, '0')} <span>{label}</span></button>)}</div>;
}

function DiagramGraphic({ diagram, active, description }: { diagram: Diagram; active: number; description: string }) {
  if (diagram.id === 'D001') return <div className="mapping-graphic"><div><small>공정위 분류</small><strong>{diagram.stateLabels?.[active]}</strong></div><span className="graphic-arrow" aria-hidden="true">→</span><div><small>서울시 서비스업종</small><strong>{diagram.facts?.seoulCategory}</strong><code>{diagram.facts?.seoulCode}</code></div></div>;
  if (diagram.id === 'D002' || diagram.id === 'D011') {
    const entity = diagram.entities?.[active];
    const relationships = diagram.relationships?.filter(r => r[0] === entity || r[1] === entity) ?? [];
    return <div className="erd-graphic"><div className="erd-entity-list">{diagram.entities?.map((name, i) => <span className={active === i ? 'active' : ''} key={name}>{name}</span>)}</div><div className="erd-detail"><small>SELECTED ENTITY</small><strong>{entity}</strong>{relationships.length > 0 ? relationships.map((r, i) => <p key={i}>{r[0]} ↔ {r[1]} <code>{r[2]}</code></p>) : <p>{description}</p>}</div></div>;
  }
  if (diagram.stages) return <div className="pipeline-graphic"><div className="pipeline-steps">{diagram.stages.map((stage, i) => <div className={`${i === active ? 'active' : ''} ${i < active ? 'passed' : ''}`} key={`${stage}-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><strong>{stage}</strong></div>)}</div><div className="pipeline-current"><small>SELECTED STAGE / {String(active + 1).padStart(2, '0')}</small><strong>{diagram.stages[active]}</strong><p>{description}</p></div></div>;
  if (diagram.states) {
    const state = diagram.states[active];
    if (diagram.id === 'D012') return <div className="history-graphic"><div className="history-card"><small>인수 전</small><strong>{state.before}</strong></div><span aria-hidden="true">→</span><div className="history-card"><small>반납 후</small><strong>{state.after}</strong></div></div>;
    return <div className="state-graphic"><small>{state.label}</small>{diagram.id !== 'D006' && state.numericCount && <strong className="state-count">{state.numericCount} <span>cases</span></strong>}<strong>{state.statement ?? state.outcome}</strong><p>{description}</p></div>;
  }
  return <p>{description}</p>;
}

export default function DiagramFrame({ diagram, sectionDescription }: { diagram: Diagram; sectionDescription: string }) {
  const [active, setActive] = useState(0);
  const labels = diagram.stateLabels ?? diagram.stages ?? diagram.entities ?? diagram.states?.map(s => String(s.label)) ?? [];
  const description = diagram.id === 'D002' ? '상권·점포·서비스업종·프랜차이즈를 연결하는 7개 테이블의 키 관계입니다.'
    : diagram.id === 'D010' ? '신청부터 검수까지 단계별 상태·사진·검수 기록의 흐름입니다.'
    : ['D003','D004','D005','D006','D007','D008','D009','D012'].includes(diagram.id) ? sectionDescription : diagram.description;
  return <figure className="diagram-frame" aria-label={`${diagram.title}: ${description}`}><div className="diagram-head"><div><h4>{diagram.title}</h4><p>{description}</p></div></div><OptionButtons labels={labels} active={active} onChange={setActive}/><DiagramGraphic diagram={diagram} active={active} description={description}/></figure>;
}
