import type {ErdVisualization,SchemaTable} from './data';
import type {RoutedConnection} from './erd-routing';

const colors=['#2855a8','#13766c','#965b19','#794ca0','#a03c61','#426c83','#596b23','#aa4b32'];
export interface ErdRelation {
  id:string;number:string;key:string;name:string;color:string;
  child:SchemaTable;parent:SchemaTable;columns:string[];targetColumns:string[];
}
export function erdRelations(model:ErdVisualization):ErdRelation[]{
  let ordinal=0;const assigned:ErdRelation[]=[];
  return model.tables.flatMap(child=>child.foreignKeys.map((key,index)=>{
    const number=String(++ordinal).padStart(2,'0');
    const preferred=colors.map((_,offset)=>colors[(ordinal-1+offset)%colors.length]);
    const conflicts=(color:string)=>assigned.filter(r=>r.color===color&&(r.parent.name===key.target||r.child.name===child.name)).length;
    const color=preferred.reduce((best,c)=>conflicts(c)<conflicts(best)?c:best,preferred[0]);
    const relation={id:`R${number}`,number,key:`${child.name}-${index}`,name:key.relationshipName||'관계명 없음',color,child,parent:model.tables.find(t=>t.name===key.target)!,columns:key.columns,targetColumns:key.targetColumns};
    assigned.push(relation);return relation;
  }));
}
export const relationForEdge=(edge:RoutedConnection,relations:Map<string,ErdRelation>)=>relations.get(edge.id.slice(0,edge.id.lastIndexOf('-')))!;
export function edgeSegments(path:string){
  const values=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),result=[];
  for(let i=2;i<values.length;i+=2)if(values[i-2]!==values[i]||values[i-1]!==values[i+1])result.push({x1:values[i-2],y1:values[i-1],x2:values[i],y2:values[i+1]});
  return result;
}
/** Break only the underpassing line at genuine perpendicular crossings. */
export function crossingBridges(edges:RoutedConnection[]):Map<string,string[]>{
  const previous:ReturnType<typeof edgeSegments>=[],result=new Map<string,string[]>();
  for(const edge of edges){
    const segments=edgeSegments(edge.path),bridges=new Set<string>();
    for(const a of segments)for(const b of previous){
      const vertical=a.x1===a.x2;if(vertical===(b.x1===b.x2))continue;
      const x=vertical?a.x1:b.x1,y=vertical?b.y1:a.y1;
      const inside=(value:number,start:number,end:number)=>value>Math.min(start,end)+5&&value<Math.max(start,end)-5;
      if(!(vertical?inside(y,a.y1,a.y2)&&inside(x,b.x1,b.x2):inside(x,a.x1,a.x2)&&inside(y,b.y1,b.y2)))continue;
      bridges.add(vertical?`M${x},${y-4} V${y+4}`:`M${x-4},${y} H${x+4}`);
    }
    result.set(edge.id,[...bridges]);previous.push(...segments);
  }
  return result;
}
