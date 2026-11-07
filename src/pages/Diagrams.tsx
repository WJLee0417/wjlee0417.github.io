import { useState } from 'react';
import { data, type Diagram } from '../data';

const staticDiagramIds = new Set(['D003', 'D004', 'D005', 'D010']);

function OptionButtons({ labels, active, onChange, label = '도식 상태 선택' }: {
  labels: string[]; active: number; onChange: (i: number) => void; label?: string;
}) {
  return <div className="diagram-options" role="group" aria-label={label}>
    {labels.map((option, i) => <button type="button" key={`${option}-${i}`} aria-pressed={active === i} className={active === i ? 'selected' : ''} onClick={() => onChange(i)}>
      <span>{option}</span>
    </button>)}
  </div>;
}

function RelationshipGraphic({ diagram, active }: { diagram: Diagram; active: number }) {
  // Index zero shows every source relationship; later indices select an entity.
  const entity = diagram.entities?.[active - 1];
  const relationships = (diagram.relationships ?? []).filter(r => !entity || r[0] === entity || r[1] === entity);
  return <div className="erd-graphic">
    <div className="erd-entity-list" role="list" aria-label="엔터티 목록">
      {diagram.entities?.map(name => <span role="listitem" className={entity === name ? 'active' : ''} key={name}>{name}</span>)}
    </div>
    <div className="erd-detail" aria-live="polite">
      <small>{diagram.id === 'D011' ? '계약 중심 데이터 모델' : '테이블과 외래키'}</small>
      <strong>{entity ?? '관계 전체'}</strong>
      {relationships.length > 0 ? relationships.map((r, i) => <p key={`${r[0]}-${r[1]}-${i}`}>
        {r[0]} ↔ {r[1]} <code>{r[2]}</code>
      </p>) : null}
    </div>
  </div>;
}

function StaticStages({ diagram }: { diagram: Diagram }) {
  const constraints = diagram.id === 'D004';
  return <div className="pipeline-graphic">
    <div className="pipeline-steps" role="list" aria-label={constraints ? '제약조건 목록' : '단계 목록'}>
      {diagram.stages?.map((stage, i) => <div role="listitem" key={`${stage}-${i}`}>
        {!constraints && <span>{String(i + 1).padStart(2, '0')}</span>}
        <strong>{stage}</strong>
      </div>)}
    </div>
  </div>;
}

function ReportBranches({ diagram }: { diagram: Diagram }) {
  const stages = diagram.stages ?? [];
  const reuseStates = data.diagrams.find(d => d.id === 'D009')?.states ?? [];
  const reuse = reuseStates.find(state => state.label === 'Same Input');
  const createStates = reuseStates.filter(state => state.label !== 'Same Input');
  return <div className="pipeline-graphic">
    <div className="pipeline-current">
      <small>입력 준비</small>
      <strong>{stages.slice(0, 3).join(' · ')}</strong>
    </div>
    <div className="pipeline-current">
      <small>기존 완료 리포트 조회</small>
      <strong>{stages[3]}</strong>
      <p>입력 Snapshot 해시가 같은 완료 리포트를 조회합니다.</p>
    </div>
    <div className="report-branches" role="list" aria-label="완료 리포트 재사용과 신규 생성 분기">
      <div className="pipeline-current" role="listitem">
        <small>{reuse?.label}</small>
        <strong>{reuse?.outcome}</strong>
        <p>기존 완료 리포트 반환 · {stages[7]}</p>
      </div>
      <div className="pipeline-current" role="listitem">
        <small>신규 생성</small>
        {createStates.map(state => <p key={String(state.label)}>{state.label} · {state.outcome}</p>)}
        <p>생성·저장 처리</p>
        <div className="pipeline-steps" role="list" aria-label="생성·저장 처리">
          {stages.slice(4, 7).map(stage => <div role="listitem" key={stage}><strong>{stage}</strong></div>)}
        </div>
        <p>생성 결과 반환 · {stages[7]}</p>
      </div>
    </div>
  </div>;
}

function DiagramGraphic({ diagram, active, description }: { diagram: Diagram; active: number; description: string }) {
  if (diagram.id === 'D001') return <div className="mapping-graphic">
    <div><small>공정위 분류</small><strong>{diagram.stateLabels?.[active]}</strong></div>
    <span className="graphic-arrow" aria-hidden="true">→</span>
    <div><small>서울시 서비스업종</small><strong>{diagram.facts?.seoulCategory}</strong><code>{diagram.facts?.seoulCode}</code></div>
  </div>;
  if (diagram.id === 'D002' || diagram.id === 'D011') return <RelationshipGraphic diagram={diagram} active={active}/>;
  if (diagram.id === 'D007') return <ReportBranches diagram={diagram}/>;
  if (diagram.stages) return <StaticStages diagram={diagram}/>;
  if (diagram.states) {
    const state = diagram.states[active];
    if (!state) return <p>{description}</p>;
    if (diagram.id === 'D012') return <div className="history-graphic" aria-live="polite">
      <div className="history-card"><small>인수 전</small><strong>{state.before}</strong></div>
      <span aria-hidden="true">→</span>
      <div className="history-card"><small>반납 후</small><strong>{state.after}</strong></div>
    </div>;
    return <div className="state-graphic" aria-live="polite">
      <small>{state.label}</small>
      {typeof state.numericCount === 'number' && <strong className="state-count">{state.numericCount} <span>사례</span></strong>}
      <strong>{state.statement ?? state.outcome}</strong>
    </div>;
  }
  return <p>{description}</p>;
}

export default function DiagramFrame({ diagram, sectionDescription }: { diagram: Diagram; sectionDescription: string }) {
  const [selection, setSelection] = useState({ diagramId: diagram.id, index: 0 });
  const relationshipView = diagram.id === 'D002' || diagram.id === 'D011';
  const labels = relationshipView ? ['관계 전체', ...(diagram.entities ?? [])]
    : diagram.stateLabels ?? diagram.states?.map(s => String(s.label)) ?? [];
  const active = selection.diagramId === diagram.id && selection.index < labels.length ? selection.index : 0;
  const interactive = !staticDiagramIds.has(diagram.id) && diagram.id !== 'D007' && labels.length > 1;
  return <figure className="diagram-frame" aria-label={`${diagram.title}: ${sectionDescription}`}>
    <div className="diagram-head"><div><h4>{diagram.title}</h4><p>{sectionDescription}</p></div></div>
    {interactive && <OptionButtons labels={labels} active={active} label={relationshipView ? '관계 전체 또는 엔터티 선택' : '도식 상태 선택'} onChange={index => setSelection({ diagramId: diagram.id, index })}/>}
    <DiagramGraphic diagram={diagram} active={active} description={sectionDescription}/>
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
}
