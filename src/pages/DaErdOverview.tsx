import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ErdVisualization, SchemaTable } from '../data';
import { routeErdConnections, type ErdConnection, type RoutedConnection } from '../erd-routing';

const name=(table:SchemaTable)=>table.displayName??table.name;

export function DaErdOverview({model,view,selected,onSelect}:{model:ErdVisualization;view:number;selected:string;onSelect:(name:string)=>void}){
  const root=useRef<HTMLDivElement>(null);
  const [drawing,setDrawing]=useState<{width:number;height:number;edges:RoutedConnection[]}>({width:1,height:1,edges:[]});
  const [focusedOnly,setFocusedOnly]=useState(false);
  const lanes=model.views[view].lanes;
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
      for(const child of model.tables){
        const c=boxes.get(child.name);if(!c)continue;
        child.foreignKeys.forEach((key,index)=>{
          const p=boxes.get(key.target);if(!p)return;
          const unique=[child.primaryKey,...child.uniqueKeys].some(columns=>columns.length===key.columns.length&&columns.every(column=>key.columns.includes(column)));
          edges.push({id:`${child.name}-${index}`,parent:key.target,child:child.name,unique,label:`${key.target} → ${child.name}: ${key.columns.map(id=>child.columns.find(column=>column.name===id)?.displayName??id).join(', ')}`});
        });
      }
      const routed=routeErdConnections(boxes,edges,element.clientWidth,element.clientHeight);
      if(alive)setDrawing({width:element.clientWidth,height:element.clientHeight,edges:routed});
    };
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(update);observer.observe(element);update();
    document.fonts.ready.then(()=>{if(alive)update();});
    return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();};
  },[model,view]);
  const connected=(edge:RoutedConnection)=>edge.child===selected||edge.parent===selected;
  return <><div className="da-relationship-tools" role="group" aria-label="관계선 표시"><button type="button" aria-pressed={!focusedOnly} onClick={()=>setFocusedOnly(false)}>전체 관계</button><button type="button" aria-pressed={focusedOnly} onClick={()=>setFocusedOnly(true)}>선택 테이블 관계</button></div><div className="da-overview" ref={root} style={{'--erd-lanes':lanes.length} as CSSProperties} aria-label="ERD 전체 구조" data-erd-overview>
    <svg className="da-overview-lines" width={drawing.width} height={drawing.height} aria-hidden="true">{[...drawing.edges].sort((a,b)=>Number(connected(a))-Number(connected(b))).filter(edge=>!focusedOnly||connected(edge)).map(edge=><g className={connected(edge)?'is-connected':''} key={edge.id} data-reused-segments={edge.reusedSegments}><title>{edge.label}</title><path className="da-edge-halo" d={edge.path}/><path d={edge.path}/><path d={edge.ending}/></g>)}</svg>
    <div className="da-overview-grid">{lanes.map((lane,index)=><div className="da-overview-lane" key={index}>{lane.map(id=>{
      const table=model.tables.find(table=>table.name===id)!;
      return <button type="button" className="da-entity" data-erd-table={id} key={id} aria-pressed={selected===id} aria-label={`${name(table)} 테이블 선택`} onClick={()=>onSelect(id)}>
        <span className="da-entity-heading"><strong>{name(table)}</strong>{table.label!==name(table)&&<span>{table.label}</span>}</span>
        <span className="da-entity-keys">{table.primaryKey.map(key=><span key={key}><b>PK</b><span>{table.columns.find(column=>column.name===key)?.displayName??key}</span></span>)}</span>
      </button>;
    })}</div>)}</div>
  </div></>;
}
