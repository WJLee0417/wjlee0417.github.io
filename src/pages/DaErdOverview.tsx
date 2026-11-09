import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ErdVisualization, SchemaTable } from '../data';
import { routeErdConnections, type ErdConnection, type RoutedConnection } from '../erd-routing';
import {placeErdLabels, type ErdLabel} from '../erd-labels';
import {ErdEdges,ErdRelationDirectory,useErdRelationFocus} from './ErdRelations';

const name=(table:SchemaTable)=>table.displayName??table.name;

export function DaErdOverview({model,view,selected,onSelect}:{model:ErdVisualization;view:number;selected:string;onSelect:(name:string)=>void}){
  const root=useRef<HTMLDivElement>(null);
  const focus=useErdRelationFocus(model,view,onSelect);
  const [drawing,setDrawing]=useState<{width:number;height:number;edges:RoutedConnection[];labels:ErdLabel[]}>({width:1,height:1,edges:[],labels:[]});
  const [focusedOnly,setFocusedOnly]=useState(false);
  const lanes=model.views[view].lanes,large=lanes.flat().length>13;
  useEffect(()=>{
    const element=root.current;if(!element)return;
    let frame=0,alive=true;
    const measure=()=>{
      const bounds=element.getBoundingClientRect();
      const boxes=new Map(Array.from(element.querySelectorAll<HTMLButtonElement>('[data-erd-table]')).map(button=>{
        const box=button.getBoundingClientRect();
        return [button.dataset.erdTable!,{x:box.left-bounds.left-element.clientLeft,y:box.top-bounds.top-element.clientTop,width:box.width,height:box.height}];
      }));
      const edges:ErdConnection[]=[];
      const anchors=new Map(Array.from(element.querySelectorAll<HTMLElement>('[data-erd-table]')).flatMap(table=>Array.from(table.querySelectorAll<HTMLElement>('[data-erd-column]')).map(column=>{
        const row=column.getBoundingClientRect();
        return [JSON.stringify([table.dataset.erdTable,column.dataset.erdColumn]),{y:row.top-bounds.top-element.clientTop+row.height/2,height:row.height}] as const;
      })));
      for(const child of model.tables){
        const c=boxes.get(child.name);if(!c)continue;
        child.foreignKeys.forEach((key,index)=>{
          const p=boxes.get(key.target);if(!p)return;
          const unique=key.cardinality==='unspecified'?null:[child.primaryKey,...child.uniqueKeys].some(columns=>columns.length===key.columns.length&&columns.every(column=>key.columns.includes(column)));
          const ref=focus.byKey.get(`${child.name}-${index}`)!;
          key.columns.forEach((column,pair)=>{
            const targetColumn=key.targetColumns[pair],parent=model.tables.find(table=>table.name===key.target)!;
            edges.push({id:`${child.name}-${index}-${pair}`,parent:key.target,child:child.name,unique,relationshipName:`${ref.number} · ${ref.name}`,parentColumn:targetColumn,childColumn:column,parentAnchor:anchors.get(JSON.stringify([key.target,targetColumn]))!,childAnchor:anchors.get(JSON.stringify([child.name,column]))!,label:`${key.relationshipName?key.relationshipName+' · ':''}${name(child)}.${child.columns.find(c=>c.name===column)?.displayName??column} → ${name(parent)}.${parent.columns.find(c=>c.name===targetColumn)?.displayName??targetColumn}`});
          });
        });
      }
      const routed=routeErdConnections(boxes,edges,element.clientWidth,element.clientHeight);
      const labels=placeErdLabels(routed,boxes,element.clientWidth,element.clientHeight);
      if(alive)setDrawing({width:element.clientWidth,height:element.clientHeight,edges:routed,labels});
    };
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(update);observer.observe(element);update();
    document.fonts.ready.then(()=>{if(alive)update();});
    return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();};
  },[model,view]);
  const connected=(edge:RoutedConnection)=>edge.child===selected||edge.parent===selected;
  return <><div className="da-overview-tools"><div className="da-relationship-tools" role="group" aria-label="관계선 표시"><button type="button" aria-pressed={!focusedOnly} onClick={()=>setFocusedOnly(false)}>전체 관계</button><button type="button" aria-pressed={focusedOnly} onClick={()=>setFocusedOnly(true)}>선택 테이블 관계</button></div><p>PK 기본키 · FK 외래키 · 번호와 관계명은 FK 행에 표시</p>{large&&<p>전체 모델은 좌우로 이동해 볼 수 있습니다. 영역별 보기에서는 화면 너비에 맞춰 표시합니다.</p>}</div><div className={large?'da-overview-scroll':undefined}><div className="da-overview" ref={root} style={{'--erd-lanes':lanes.length} as CSSProperties} aria-label="ERD 전체 구조" data-erd-overview data-columns="all">
    <svg className="da-overview-lines" width={drawing.width} height={drawing.height} aria-label="FK와 참조 키 연결"><ErdEdges edges={drawing.edges.filter(edge=>!focusedOnly||connected(edge))} labels={drawing.labels.filter(label=>!focusedOnly||drawing.edges.some(edge=>edge.id===label.id&&connected(edge)))} focus={focus} selected={selected}/></svg>
    <div className="da-overview-grid">{lanes.map((lane,index)=><div className="da-overview-lane" key={index}>{lane.map(id=>{
      const table=model.tables.find(table=>table.name===id)!;
      const columns=table.columns;
      const keys=columns.filter(column=>table.primaryKey.includes(column.name)||table.foreignKeys.some(key=>key.columns.includes(column.name)));
      const attributes=columns.filter(column=>!keys.includes(column));
      const field=(column:typeof columns[number])=>{
        const pk=table.primaryKey.includes(column.name),fk=table.foreignKeys.some(key=>key.columns.includes(column.name));
        const refs=focus.relations.filter(r=>r.child.name===id&&r.columns.includes(column.name)),active=focus.relations.find(r=>r.id===focus.active);
        const isActive=Boolean(active&&(active.child.name===id&&active.columns.includes(column.name)||active.parent.name===id&&active.targetColumns.includes(column.name)));
        return <span data-relation-active={isActive||undefined} className="da-column" key={column.name} data-erd-column={column.name} data-key={pk&&fk?'PK/FK':pk?'PK':fk?'FK':'attribute'}><b>{pk&&fk?'PK/FK':pk?'PK':fk?'FK':''}</b><span className="da-field-label">{column.displayName??column.name}{refs.map(r=><small key={r.id} style={{color:r.color}} data-fk-relation-name={r.id}>{r.name}</small>)}</span>{refs.length>0&&<span className="da-reference-ids">{refs.map(r=><em key={r.id} title={`${r.number} · ${r.name}`} style={{color:r.color}} onMouseEnter={()=>focus.hover(r.id)} onMouseLeave={()=>focus.hover(null)}>{r.number}</em>)}</span>}</span>;
      };
      return <button type="button" className="da-entity" data-erd-table={id} key={id} aria-pressed={selected===id} aria-label={`${name(table)} 테이블 선택`} onClick={()=>{focus.clear();onSelect(id);}}>
        <span className="da-entity-heading"><strong>{name(table)}</strong>{table.label!==name(table)&&<span>{table.label}</span>}</span>
        <span className="da-entity-keys">{keys.map(field)}</span>
        {attributes.length>0&&<span className="da-entity-attributes">{attributes.map(field)}</span>}
      </button>;
    })}</div>)}</div>
  </div></div><ErdRelationDirectory focus={focus} onReveal={r=>root.current?.querySelector<HTMLElement>(`[data-erd-table="${r.child.name}"] [data-erd-column="${r.columns[0]}"]`)?.scrollIntoView({block:'center',inline:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}/></>;
}
