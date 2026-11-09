import type {ErdBox, RoutedConnection} from './erd-routing';

export interface ErdLabel {id:string;text:string;x:number;y:number;width:number;height:number;vertical:boolean}
type Segment={x1:number;y1:number;x2:number;y2:number};
const overlaps=(a:ErdBox,b:ErdBox)=>a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height+4&&a.y+a.height+4>b.y;
const touches=(s:Segment,b:ErdBox)=>s.x1===s.x2?s.x1>=b.x-2&&s.x1<=b.x+b.width+2&&Math.max(s.y1,s.y2)>=b.y-2&&Math.min(s.y1,s.y2)<=b.y+b.height+2:s.y1>=b.y-2&&s.y1<=b.y+b.height+2&&Math.max(s.x1,s.x2)>=b.x-2&&Math.min(s.x1,s.x2)<=b.x+b.width+2;

/** Fit model relationship names in clear connector segments, never over cards. */
export function placeErdLabels(edges:RoutedConnection[],boxes:Map<string,ErdBox>,width:number,height:number):ErdLabel[]{
  const segments=edges.flatMap(edge=>{
    const values=edge.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),result=[];
    for(let i=2;i<values.length;i+=2)result.push({id:edge.id,x1:values[i-2],y1:values[i-1],x2:values[i],y2:values[i+1]});
    return result;
  });
  const labels:ErdLabel[]=[];
  for(const edge of edges){
    const text=edge.relationshipName;if(!text)continue;
    const length=[...text].reduce((n,char)=>n+(/\s/.test(char)?5:14),0)+16;
    const candidates=segments.filter(s=>s.id===edge.id).map(s=>({...s,vertical:s.x1===s.x2,length:Math.abs(s.x2-s.x1)+Math.abs(s.y2-s.y1)})).filter(s=>s.length>=length+8).sort((a,b)=>Number(a.vertical)-Number(b.vertical)||b.length-a.length);
    let placed=false;
    for(const s of candidates){
      if(placed)break;
      for(const ratio of [.5,.25,.75])for(const offset of [0,18,-18]){
        if(placed)break;
        const w=s.vertical?24:length,h=s.vertical?length:24;
        const x=s.x1+(s.x2-s.x1)*ratio-w/2+(s.vertical?offset:0),y=s.y1+(s.y2-s.y1)*ratio-h/2+(s.vertical?0:offset);
        const box={x,y,width:w,height:h};
        if(x<4||y<4||x+w>width-4||y+h>height-4||[...boxes.values()].some(b=>overlaps(box,b))||labels.some(b=>overlaps(box,b))||segments.some(other=>other.id!==edge.id&&touches(other,box)))continue;
        labels.push({id:edge.id,text,...box,vertical:s.vertical});placed=true;break;
      }
    }
  }
  return labels;
}

export function ErdRelationshipLabels({labels}:{labels:ErdLabel[]}){
  return labels.map(label=><g key={label.id} className="erd-relationship-label" data-relationship-name={label.text}><rect x={label.x} y={label.y} width={label.width} height={label.height} rx={3}/><text x={label.x+label.width/2} y={label.y+label.height/2} textAnchor="middle" dominantBaseline="central" style={label.vertical?{writingMode:'vertical-rl'}:undefined}>{label.text}</text></g>);
}
