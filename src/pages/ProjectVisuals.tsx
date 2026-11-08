import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { type ErdVisualization, type FlowVisualization, type Project, type SchemaTable } from '../data';
import { Bullets } from './Deck';
import { DaErdOverview } from './DaErdOverview';
import { routeErdConnections, type ErdConnection } from '../erd-routing';

const NODE_WIDTH=460,ROW=50,HEAD=72,GAP=96;
const tableName=(table:SchemaTable)=>table.displayName??table.name;
const tableOption=(table:SchemaTable)=>[...new Set([tableName(table),table.label])].join(' · ');
const columnName=(table:SchemaTable,name:string)=>table.columns.find(column=>column.name===name)?.displayName??name;
const keyNames=(table:SchemaTable,names:string[])=>names.map(name=>columnName(table,name)).join(' + ');
function displayedColumns(table: SchemaTable, all: boolean) {
  if(all)return table.columns;
  const keys=new Set([...table.primaryKey,...table.foreignKeys.flatMap(key=>key.columns)]);
  const extra=table.columns.filter(column=>!keys.has(column.name)).slice(0,3).map(column=>column.name);
  return table.columns.filter(column=>keys.has(column.name)||extra.includes(column.name));
}
function schemaLayout(model: ErdVisualization, view: number, all: boolean) {
  const nodes=model.views[view].lanes.flatMap((names,lane)=>{
    let y=40;
    return names.map(name=>{
      const table=model.tables.find(table=>table.name===name)!;
      const columns=displayedColumns(table,all),height=HEAD+columns.length*ROW+30;
      const node={table,columns,x:40+lane*(NODE_WIDTH+GAP),y,height};y+=height+85;return node;
    });
  });
  return {nodes,width:80+model.views[view].lanes.length*NODE_WIDTH+(model.views[view].lanes.length-1)*GAP,height:Math.max(...nodes.map(node=>node.y+node.height))+40};
}

type ErdSelection={view: number; all: boolean; selected: string; overview:boolean};
function ErdWorkspace({model, expanded=false, initial, onExpand}: {model: ErdVisualization; expanded?: boolean; initial?: ErdSelection; onExpand?:(selection:ErdSelection)=>void}) {
  const [view,setView]=useState(initial?.view??0),[all,setAll]=useState(initial?.all??true),[zoom,setZoom]=useState(1),[selected,setSelected]=useState(initial?.selected??model.views[0].focus);
  const [settings,setSettings]=useState(false);
  const [overview,setOverview]=useState(initial?.overview??true);
  const viewport=useRef<HTMLDivElement>(null),marker=useId().replaceAll(':','');
  const currentSelection=useRef(selected);currentSelection.current=selected;
  const layout=schemaLayout(model,view,all);
  const detailedEdges=useMemo(()=>{
    if(overview)return [];
    const nodes=schemaLayout(model,view,all),boxes=new Map(nodes.nodes.map(node=>[node.table.name,{x:node.x,y:node.y,width:NODE_WIDTH,height:node.height}]));
    const edges:ErdConnection[]=nodes.nodes.flatMap(node=>node.table.foreignKeys.flatMap((key,index)=>{
      if(!boxes.has(key.target))return [];
      const unique=[node.table.primaryKey,...node.table.uniqueKeys].some(columns=>columns.length===key.columns.length&&columns.every(column=>key.columns.includes(column)));
      return [{id:`${node.table.name}-${index}`,parent:key.target,child:node.table.name,unique,label:`${tableName(model.tables.find(table=>table.name===key.target)!)} → ${tableName(node.table)} · ${keyNames(node.table,key.columns)}`}];
    }));
    return routeErdConnections(boxes,edges,nodes.width,nodes.height);
  },[model,view,all,overview]);
  const table=model.tables.find(table=>table.name===selected)!;
  const resetZoom=()=>setZoom(1);
  useEffect(()=>{
    const element=viewport.current;if(!element)return;let previous=-1,frame=0;
    const resize=()=>{
      const width=element.clientWidth;if(!width || width===previous)return;previous=width;
      setZoom(1);
      cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const focus=layout.nodes.find(node=>node.table.name===currentSelection.current)!;element.scrollTo({left:layout.width>width?Math.max(0,focus.x-20):0,top:Math.max(0,focus.y-20)});});
    };
    resize();const observer=new ResizeObserver(resize);observer.observe(element);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[view,all,expanded,overview]);
  const connected=model.tables.flatMap(child=>child.foreignKeys.map(key=>({child,key}))).filter(item=>item.child.name===selected||item.key.target===selected);
  const nodeMap=new Map(layout.nodes.map(node=>[node.table.name,node]));
  const changeView=(index:number)=>{setView(index);setSelected(model.views[index].focus);};
  return <div className="erd-workspace">
    <div className="visual-options" role="group" aria-label="ERD 영역">{model.views.map((item,index)=><button type="button" key={item.id} aria-pressed={view===index} onClick={()=>changeView(index)}>{item.label}</button>)}</div>
    <div className="erd-display-modes" role="group" aria-label="ERD 표시 방식"><button type="button" aria-pressed={overview} onClick={()=>setOverview(true)}>전체 구조</button><button type="button" aria-pressed={!overview} onClick={()=>setOverview(false)}>컬럼 상세</button><span>PK 기본키 · 테이블 선택 시 상세 표시</span>{onExpand&&<button type="button" className="erd-overview-expand" onClick={()=>onExpand({view,all,selected,overview})}>크게 보기 ↗</button>}</div>
    {!overview&&<><div className="erd-mobile-tools"><button type="button" aria-expanded={settings} aria-controls={`erd-settings-${marker}`} onClick={()=>setSettings(!settings)}>보기 설정 {settings?'−':'+'}</button></div>
    <div className="erd-toolbar" id={`erd-settings-${marker}`} data-open={settings}><div><span><b>PK</b> 기본키</span><span><b>FK</b> 외래키</span><span>0..N 여러 행</span></div><div><button type="button" disabled={zoom<=1} onClick={()=>setZoom(Math.max(1,zoom-.15))} aria-label="ERD 축소">−</button><output aria-label="ERD 배율">{Math.round(zoom*100)}%</output><button type="button" onClick={()=>setZoom(Math.min(2,zoom+.15))} aria-label="ERD 확대">+</button><button type="button" onClick={resetZoom}>기본 배율</button><button type="button" aria-pressed={all} onClick={()=>setAll(!all)}>{all?'키 중심':'전체 컬럼'}</button></div></div></>}
    <label className="erd-table-picker">테이블 선택 <select value={selected} onChange={event=>{setSelected(event.target.value);const node=nodeMap.get(event.target.value)!;viewport.current?.scrollTo({left:Math.max(0,node.x*zoom-20),top:Math.max(0,node.y*zoom-20),behavior:'instant'});}}>{layout.nodes.map(node=><option key={node.table.name} value={node.table.name}>{tableOption(node.table)}</option>)}</select></label>
    {overview?<DaErdOverview model={model} view={view} selected={selected} onSelect={setSelected}/>:<><p className="visual-hint">테이블을 선택하면 전체 컬럼·키·연결 관계 표시</p>
    <div className="erd-viewport" ref={viewport} tabIndex={0} role="region" aria-label="확대·가로 이동 가능한 ERD">
      <svg className="erd-svg" width={layout.width*zoom} height={layout.height*zoom} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-label={model.title}>
        <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="none" stroke="currentColor"/></marker></defs>
        {[...detailedEdges].sort((a,b)=>Number(a.child===selected||a.parent===selected)-Number(b.child===selected||b.parent===selected)).map(edge=><g key={edge.id} className={`erd-edge ${edge.child===selected||edge.parent===selected?'is-connected':''}`} aria-label={edge.label}><title>{edge.label}</title><path className="da-edge-halo" d={edge.path}/><path d={edge.path}/><path d={edge.ending}/></g>)}
        {layout.nodes.map(node=><g key={node.table.name} transform={`translate(${node.x},${node.y})`} className={`erd-entity ${selected===node.table.name?'is-selected':''}`} role="button" tabIndex={0} aria-pressed={selected===node.table.name} aria-label={`${tableOption(node.table)} 테이블 선택`} onClick={()=>setSelected(node.table.name)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(node.table.name);}}}>
          <rect width={NODE_WIDTH} height={node.height} className="erd-entity-body"/><rect width={NODE_WIDTH} height={HEAD-8} className="erd-entity-head"/>
          <text x={14} y={25} className="erd-table-name">{tableName(node.table)}</text><text x={14} y={49} className="erd-table-label erd-head-label">{node.table.label===tableName(node.table)?`${node.table.columns.length} columns`:node.table.label}</text>
          {node.columns.map((column,index)=>{
            const pk=node.table.primaryKey.includes(column.name),fk=node.table.foreignKeys.some(key=>key.columns.includes(column.name));
            return <g key={column.name} transform={`translate(0,${HEAD+index*ROW})`}><text x={12} y={17} className="erd-key">{pk&&fk?'PK·FK':pk?'PK':fk?'FK':''}</text><text x={74} y={17} className="erd-column">{column.displayName??column.name}</text><text x={74} y={38} className="erd-type">{column.type}</text></g>;
          })}
          <text x={14} y={node.height-10} className="erd-table-label">{all?'전체 컬럼':`${node.columns.length} / ${node.table.columns.length} 컬럼 · 선택하여 상세 보기`}</text>
        </g>)}
      </svg>
    </div></>}
    <section className="erd-inspector" aria-label="선택 테이블 상세"><div className="erd-inspector-heading"><div><p className="web-eyebrow">TABLE DETAIL</p><h3 aria-live="polite">{table.displayName??table.label}{(table.displayName?table.label:table.name)!==(table.displayName??table.label) && <small>{table.displayName?table.label:table.name}</small>}</h3></div><div className="erd-key-summary"><p><b>PK</b> {keyNames(table,table.primaryKey)}</p>{table.uniqueKeys.map((key,index)=><p key={index}><b>UNIQUE</b> {keyNames(table,key)}</p>)}</div></div>
      <div className="erd-detail-grid"><div className="erd-column-scroll"><table><caption>컬럼·타입·NULL 허용</caption><thead><tr><th>키</th><th>컬럼</th><th>타입</th><th>NULL</th></tr></thead><tbody>{table.columns.map(column=><tr key={column.name}><td>{[table.primaryKey.includes(column.name)?'PK':'',table.foreignKeys.some(key=>key.columns.includes(column.name))?'FK':''].filter(Boolean).join(' / ')||'—'}</td><th scope="row">{column.displayName??column.name}</th><td>{column.type}</td><td>{column.nullable?'허용':'불가'}</td></tr>)}</tbody></table></div>
      <div className="erd-relations"><h4>연결 관계</h4>{connected.length?connected.map(({child,key},index)=>{const target=model.tables.find(table=>table.name===key.target)!;return <p key={index}><code>{tableName(child)}.{keyNames(child,key.columns)}</code><span>→</span><code>{tableName(target)}.{keyNames(target,key.targetColumns)}</code></p>;}):<p>외래키 연결 없음</p>}</div></div>
      {table.columns.some(column=>column.displayName) && <details className="erd-original-names"><summary>SQL 이름 대응표</summary><p>{tableName(table)} → {table.name}</p><div className="erd-column-scroll"><table><thead><tr><th>영문명</th><th>SQL 컬럼명</th></tr></thead><tbody>{table.columns.map(column=><tr key={column.name}><th scope="row">{column.displayName??column.name}</th><td>{column.name}</td></tr>)}</tbody></table></div></details>}
    </section>
  </div>;
}

export function ErdViewer({model}: {model: ErdVisualization}) {
  const [expanded,setExpanded]=useState<ErdSelection|null>(null),dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if(!expanded)return;const element=dialog.current;const previous=document.body.style.overflow,opener=document.activeElement as HTMLElement|null;
    element?.showModal();document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous;opener?.focus({preventScroll:true});};
  },[expanded]);
  return <><ErdWorkspace model={model} onExpand={setExpanded}/>{expanded && <dialog className="visual-dialog" ref={dialog} onClose={()=>setExpanded(null)} onCancel={()=>setExpanded(null)} aria-label={`${model.title} 크게 보기`}><header><h2>{model.title}</h2><button type="button" onClick={()=>dialog.current?.close()} aria-label="ERD 크게 보기 닫기">닫기 ×</button></header><ErdWorkspace model={model} initial={expanded} expanded/></dialog>}</>;
}

function ReportFlow({model}: {model: FlowVisualization}) {
  const [selected,setSelected]=useState(0),id=useId().replaceAll(':',''),scenario=model.scenarios[selected];
  const pairs=[...new Set(model.scenarios.flatMap(s=>s.path.slice(1).map((node,index)=>`${s.path[index]}|${node}`)))];
  const activePairs=new Set(scenario.path.slice(1).map((node,index)=>`${scenario.path[index]}|${node}`));
  return <><div className="visual-options" role="group" aria-label="리포트 요청 조건">{model.scenarios.map((item,index)=><button key={item.id} type="button" aria-pressed={selected===index} onClick={()=>setSelected(index)}>{item.label}</button>)}</div>
    <div className="flow-scroll" tabIndex={0} role="region" aria-label="리포트 생성 처리 흐름"><svg viewBox="0 0 1130 465" className="report-flow-svg" role="img" aria-label={`${scenario.label} 처리 경로`}><defs><marker id={id} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
      {pairs.map(pair=>{const [from,to]=pair.split('|'),a=model.nodes.find(node=>node.id===from)!,b=model.nodes.find(node=>node.id===to)!;
        let path:string;if(a.x===b.x)path=`M${a.x+95},${a.y+(a.y<b.y?76:0)} L${b.x+95},${b.y+(a.y<b.y?0:76)}`;
        else path=`M${a.x+190},${a.y+38} C${(a.x+b.x+190)/2},${a.y+38} ${(a.x+b.x+190)/2},${b.y+38} ${b.x},${b.y+38}`;
        return <path key={pair} d={path} className={`flow-edge ${activePairs.has(pair)?'is-active':''}`} markerEnd={`url(#${id})`}/>;})}
      {model.nodes.map(node=><g key={node.id} transform={`translate(${node.x},${node.y})`} className={`flow-node ${scenario.path.includes(node.id)?'is-active':''}`}><rect width="190" height="76"/><text x="14" y="29">{node.title}</text><text x="14" y="53" className="flow-node-detail">{node.detail}</text></g>)}
    </svg></div><ol className="report-mobile-flow" aria-label={`${scenario.label} 처리 순서`}>{scenario.path.map((id,index)=>{const node=model.nodes.find(node=>node.id===id)!;return <li key={id}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{node.title}</strong><small>{node.detail}</small></div></li>;})}</ol><div className="flow-outcome" aria-live="polite"><div><p className="web-eyebrow">{scenario.label}</p><h3>{scenario.description}</h3><p>Provider 호출: {scenario.providerCall?'진행':'생략'}</p></div><dl><div><dt>HTTP</dt><dd>{scenario.httpStatus}</dd></div><div><dt>generationSource</dt><dd>{scenario.source==='UNCHANGED'?'기존 출처 유지':scenario.source}</dd></div><div><dt>generated</dt><dd>{String(scenario.generated)}</dd></div><div><dt>cacheHit</dt><dd>{String(scenario.cacheHit)}</dd></div></dl></div></>;
}

function RoutingComparison({project}: {project: Project}) {
  const [selected,setSelected]=useState(0),comparison=project.comparison!;
  const ids=[...new Set(comparison.rows.map(row=>row.caseId))],rows=comparison.rows.filter(row=>row.caseId===ids[selected]);
  return <><div className="visual-options" role="group" aria-label="경로 최적화 입력 선택">{ids.map((id,index)=><button type="button" key={id} aria-pressed={selected===index} onClick={()=>setSelected(index)}>소규모 입력 {index+1}</button>)}</div>
    <div className="routing-scope">추가 검증 2026.11 · 입력별 5개 시드 · 승객 7명 · 차량 2대 · 용량 5 · 허용 도보거리 30</div>
    <div className="routing-chart" role="img" aria-label={rows.map(row=>`${row.phase}: 배정 ${row.servedPassengers}/${row.totalPassengers}명, 미배정 ${row.unassignedPassengers}명, 비용 ${row.cost??'완료해 없음'}`).join(' / ')}>{rows.map(row=><div className="routing-chart-row" key={`${row.variant}-${row.stage}`}><div><h3>{row.phase}</h3><p>미배정 {row.unassignedPassengers}명</p></div><div className="passenger-chart">{Array.from({length:row.totalPassengers},(_,index)=><span className={index<row.servedPassengers?'is-served':''} key={index} aria-hidden="true"><svg viewBox="0 0 20 32"><circle cx="10" cy="6" r="4"/><path d="M4 14 Q10 10 16 14 L16 23 L13 23 L13 31 L7 31 L7 23 L4 23Z"/></svg></span>)}<strong>{row.servedPassengers}/{row.totalPassengers}<small>명 배정</small></strong></div><div className="routing-cost"><small>비용</small><strong>{row.cost??'—'}</strong><p>{row.cost===null?'완료해 없음':'입력 비용 단위'}</p></div></div>)}</div>
    <div className="routing-interpretation"><Bullets text={comparison.interpretation}/></div><figure className="routing-time-window"><h3>시간창 판정 예시 · 소규모 입력 1</h3><div className="diagram-image-scroll" tabIndex={0} role="region" aria-label="시간창 비교 도식 가로 이동"><img src={`${import.meta.env.BASE_URL}${comparison.figurePath}`} alt={comparison.figureAlt}/></div><figcaption>도착 시각을 시간창과 비교한 뒤 하차 처리 시간을 다음 운행에 반영</figcaption></figure>
  </>;
}

export function ProjectVisual({project}: {project: Project}) {
  const model=project.visualization;if(!model)return null;
  return <section className="project-visual" data-visual-kind={model.kind}><header className="visual-heading"><p className="web-eyebrow">{model.kind==='erd'?'DATA MODEL':model.kind==='routing'?'ROUTING RESULTS':'REPORT PIPELINE'}</p><h2>{model.title}</h2>{model.kind==='erd'?<details className="visual-design-notes"><summary>설계 포인트</summary><Bullets text={model.summary}/></details>:<Bullets text={model.summary}/>}</header>
    {model.kind==='erd'?<ErdViewer model={model}/>:model.kind==='report-flow'?<ReportFlow model={model}/>:<RoutingComparison project={project}/>}
    <nav className="visual-source-links" aria-label="관련 구현 코드">{model.sources.map((source,index)=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{model.kind==='erd'?index===0?'스키마 SQL':'이력 이전 스키마':model.kind==='routing'?'시드별 결과·검증 조건':['생성 서비스','재사용 SQL','REST API'][index]} ↗</a>)}</nav>
  </section>;
}
