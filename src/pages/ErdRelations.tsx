import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import type {ErdVisualization} from '../data';
import type {RoutedConnection} from '../erd-routing';
import {erdRelations,relationForEdge,crossingBridges,type ErdRelation} from '../erd-relations';
import {ErdRelationshipLabels,type ErdLabel} from '../erd-labels';

export function useErdRelationFocus(model:ErdVisualization,view:number,onSelect:(table:string)=>void){
  const all=useMemo(()=>erdRelations(model),[model]);
  const byKey=useMemo(()=>new Map(all.map(r=>[r.key,r])),[all]);
  const [pinned,setPinned]=useState<string|null>(null),[hovered,setHovered]=useState<string|null>(null);
  useEffect(()=>{setPinned(null);setHovered(null);},[model,view]);
  const names=new Set(model.views[view].lanes.flat());
  const relations=all.filter(r=>names.has(r.child.name)&&names.has(r.parent.name));
  return {relations,byKey,active:hovered??pinned,pinned,
    hover:setHovered,clear:()=>{setPinned(null);setHovered(null);},
    toggle:(id:string)=>{setPinned(old=>old===id?null:id);setHovered(null);const r=all.find(r=>r.id===id);if(r)onSelect(r.child.name);},
  };
}
export type ErdRelationFocus=ReturnType<typeof useErdRelationFocus>;
const style=(r:ErdRelation)=>({'--relation-color':r.color} as CSSProperties);

export function ErdRelationDirectory({focus,onReveal}:{focus:ErdRelationFocus;onReveal?:(relation:ErdRelation)=>void}){
  const active=focus.relations.find(r=>r.id===focus.active);
  return <section className="erd-relation-directory" aria-label="관계명 목록">
    <header><h3>관계명 <span>{focus.relations.length}</span></h3><p>번호를 선택하면 해당 FK와 참조 키를 강조합니다.</p><button type="button" onClick={focus.clear} disabled={!focus.pinned}>강조 해제</button></header>
    <div className="erd-relation-key">{focus.relations.map(r=><button type="button" key={r.id} data-relation-key={r.id} style={style(r)} aria-pressed={focus.pinned===r.id} onMouseEnter={()=>focus.hover(r.id)} onMouseLeave={()=>focus.hover(null)} onFocus={()=>focus.hover(r.id)} onBlur={()=>focus.hover(null)} onClick={()=>{focus.toggle(r.id);if(focus.pinned!==r.id)onReveal?.(r);}}><b>{r.number}</b><span><strong>{r.name}</strong><span>{r.parent.label} → {r.child.label}</span></span></button>)}</div>
    {!focus.relations.length&&<p>이 영역에는 테이블 간 FK 관계가 없습니다.</p>}
    {active&&<p className="erd-active-relation" style={style(active)}><b>{active.number} · {active.name}</b><code>{active.child.displayName??active.child.name}.{active.columns.join(' + ')} → {active.parent.displayName??active.parent.name}.{active.targetColumns.join(' + ')}</code></p>}
  </section>;
}

export function ErdEdges({edges,labels,focus,selected}:{edges:RoutedConnection[];labels:ErdLabel[];focus:ErdRelationFocus;selected:string}){
  const relation=(edge:RoutedConnection)=>relationForEdge(edge,focus.byKey);
  // Hover must not move the pressed SVG element between pointerdown/up.
  const ordered=[...edges].sort((a,b)=>Number(relation(a).id===focus.pinned)-Number(relation(b).id===focus.pinned)||Number(a.child===selected||a.parent===selected)-Number(b.child===selected||b.parent===selected));
  const bridges=useMemo(()=>crossingBridges(ordered),[edges,focus.pinned,selected]);
  return <>{ordered.map(edge=>{
    const r=relation(edge),active=focus.active===r.id,dimmed=Boolean(focus.active&&!active);
    return <g key={edge.id} className={`erd-edge ${active?'is-active':''} ${dimmed?'is-dimmed':''}`} style={style(r)} data-relation-id={r.id} data-source-table={edge.child} data-source-column={edge.childColumn} data-target-table={edge.parent} data-target-column={edge.parentColumn} data-reused-segments={edge.reusedSegments} role="button" tabIndex={0} aria-label={`${r.number} ${r.name}: ${edge.label}`} aria-pressed={focus.pinned===r.id} onMouseEnter={()=>focus.hover(r.id)} onMouseLeave={()=>focus.hover(null)} onFocus={()=>focus.hover(r.id)} onBlur={()=>focus.hover(null)} onClick={()=>focus.toggle(r.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focus.toggle(r.id);}}}>
      <title>{r.number} · {r.name} · {edge.label}</title><path className="erd-edge-hit" d={edge.path}/><path className="erd-connection-path" d={edge.path}/><path className="erd-connection-end" d={edge.ending}/>
      {bridges.get(edge.id)?.map(d=><g key={d} className="erd-crossing"><path className="erd-crossing-gap" d={d}/><path className="erd-crossing-over" d={d}/></g>)}
    </g>;
  })}{labels.map(label=>{const r=focus.byKey.get(label.id.slice(0,label.id.lastIndexOf('-')))!;return <g key={label.id} style={{...style(r),opacity:focus.active&&focus.active!==r.id?0.16:1}}><ErdRelationshipLabels labels={[label]}/></g>;})}</>;
}
