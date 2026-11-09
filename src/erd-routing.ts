export interface ErdBox { x:number; y:number; width:number; height:number }
export interface ErdColumnAnchor { y:number; height:number }
export interface ErdConnection { id:string; parent:string; child:string; unique:boolean|null; label:string; relationshipName?:string; parentColumn?:string;childColumn?:string;parentAnchor?:ErdColumnAnchor;childAnchor?:ErdColumnAnchor }
export interface RoutedConnection extends ErdConnection { path:string; ending:string; reusedSegments:number }
type Point={x:number;y:number};
type Side='left'|'right'|'top'|'bottom';
type Port={box:ErdBox;side:Side;opposite:ErdBox;anchor?:ErdColumnAnchor;point?:Point;exit?:Point};

class MinHeap {
  entries:Array<{state:number;cost:number;priority:number}>=[];
  push(item:{state:number;cost:number;priority:number}){
    const a=this.entries;a.push(item);let i=a.length-1;
    while(i){const p=(i-1)>>1;if(a[p].priority<=item.priority)break;a[i]=a[p];i=p;}a[i]=item;
  }
  pop(){
    const a=this.entries,first=a[0],last=a.pop()!;
    if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].priority<a[c].priority)c++;if(a[c].priority>=last.priority)break;a[i]=a[c];i=c;}a[i]=last;}
    return first;
  }
}

/** Give every FK distinct ports and route orthogonal connectors outside entities. */
export function routeErdConnections(boxes:Map<string,ErdBox>,connections:ErdConnection[],width:number,height:number):RoutedConnection[]{
  if(!connections.length)return [];
  const dense=connections.length>30,step=dense?2.5:width<600||connections.some(edge=>edge.parentAnchor||edge.childAnchor)?5:10,columns=Math.floor(width/step)+1;
  const ports=new Map<string,Port[]>();
  const register=(id:string,port:Port)=>{const key=id+':'+port.side;const list=ports.get(key)??[];list.push(port);ports.set(key,list);return port;};
  const edges=connections.map((connection,index)=>{
    const p=boxes.get(connection.parent)!,c=boxes.get(connection.child)!;
    const sameColumn=Math.abs(p.x-c.x)<5,down=p.y<c.y,right=p.x<c.x;
    const sameSide:Side=index%2?'right':'left';
    const start=register(connection.child,{box:c,opposite:p,anchor:connection.childAnchor,side:connection.childAnchor?(sameColumn?sameSide:right?'left':'right'):sameColumn?(down?'top':'bottom'):right?'left':'right'});
    const end=register(connection.parent,{box:p,opposite:c,anchor:connection.parentAnchor,side:connection.parentAnchor?(sameColumn?sameSide:right?'right':'left'):sameColumn?(down?'bottom':'top'):right?'right':'left'});
    return {connection,start,end};
  });
  for(const group of ports.values()){
    const horizontal=['left','right'].includes(group[0].side);
    group.sort((a,b)=>(horizontal?a.opposite.y:a.opposite.x)-(horizontal?b.opposite.y:b.opposite.x));
    group.forEach((port,i)=>{
      const b=port.box;
      const siblings=port.anchor?group.filter(p=>p.anchor?.y===port.anchor!.y):[];
      const slot=siblings.indexOf(port),spacing=port.anchor&&siblings.length>1?Math.min(step,(port.anchor.height-4)/(siblings.length-1)):step;
      const along=port.anchor?port.anchor.y+(slot-(siblings.length-1)/2)*spacing:Math.round(((horizontal?b.y:b.x)+12+(i+1)*((horizontal?b.height:b.width)-24)/(group.length+1))/step)*step;
      if(horizontal){
        const x=port.side==='right'?b.x+b.width:b.x;
        port.point={x,y:along};
        const clearance=dense?3:1;
        port.exit={x:port.side==='right'?(Math.ceil(x/step)+clearance)*step:(Math.floor(x/step)-clearance)*step,y:along};
      }
      else {const y=port.side==='bottom'?b.y+b.height:b.y;port.point={x:along,y};port.exit={x:along,y:port.side==='bottom'?(Math.ceil(y/step)+1)*step:(Math.floor(y/step)-1)*step};}
    });
  }
  // Preserve every exact row port in the routing grid. Rounding many links to
  // a shared dimension PK onto 5px rows collapses distinct endpoints.
  const verticalStep=dense?5:step;
  const ys=[...new Set([...Array.from({length:Math.floor(height/verticalStep)+1},(_,i)=>i*verticalStep),...edges.flatMap(e=>[e.start.exit!.y,e.end.exit!.y])])].sort((a,b)=>a-b);
  const yIndices=new Map(ys.map((y,i)=>[y,i])),rows=ys.length,total=columns*rows;
  const node=(p:Point)=>yIndices.get(p.y)!*columns+Math.round(p.x/step);
  const point=(index:number)=>({x:(index%columns)*step,y:ys[Math.floor(index/columns)]});
  const segment=(a:number,b:number)=>Math.min(a,b)*total+Math.max(a,b);
  const blocked=new Uint8Array(total),usage=new Map<number,number>(),pointsUsed=new Uint16Array(total),reserved=new Map<number,string>();
  const obstacles=[...boxes.values()];
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    if(obstacles.some(b=>x*step>=b.x-5&&x*step<=b.x+b.width+5&&ys[y]>=b.y-5&&ys[y]<=b.y+b.height+5))blocked[y*columns+x]=1;
  }
  for(const edge of edges)for(const port of [edge.start,edge.end]){
    const exit=port.exit!,outward={x:exit.x+(port.side==='left'?-step:port.side==='right'?step:0),y:exit.y+(port.side==='top'?-step:port.side==='bottom'?step:0)};
    reserved.set(segment(node(exit),node(outward)),edge.connection.id);
  }
  edges.sort((a,b)=>{
    const distance=(edge:typeof a)=>Math.abs(edge.start.exit!.x-edge.end.exit!.x)+Math.abs(edge.start.exit!.y-edge.end.exit!.y);
    return distance(a)-distance(b);
  });
  return edges.map(({connection,start,end})=>{
    const origin=node(start.exit!),target=node(end.exit!),costs=new Float64Array(total*3).fill(Infinity),parents=new Int32Array(total*3).fill(-1),heap=new MinHeap();
    const heuristic=(index:number)=>Math.abs(index%columns-target%columns)*step+Math.abs(ys[Math.floor(index/columns)]-ys[Math.floor(target/columns)]);
    costs[origin*3]=0;heap.push({state:origin*3,cost:0,priority:heuristic(origin)});let found=-1;
    while(heap.entries.length){
      const current=heap.pop();if(current.cost!==costs[current.state])continue;
      const index=Math.floor(current.state/3),previousAxis=current.state%3;
      if(index===target){found=current.state;break;}
      const x=index%columns,y=Math.floor(index/columns);
      for(const [dx,dy,axis] of [[1,0,1],[-1,0,1],[0,1,2],[0,-1,2]]){
        const nx=x+dx,ny=y+dy;if(nx<1||ny<1||nx>=columns-1||ny>=rows-1)continue;
        const next=ny*columns+nx;if(blocked[next]&&next!==target)continue;
        if(usage.has(segment(index,next)))continue;
        const owner=reserved.get(segment(index,next));if(owner&&owner!==connection.id)continue;
        const weight=(dx?step:Math.abs(ys[ny]-ys[y]))+(previousAxis&&previousAxis!==axis?9:0)+pointsUsed[next]*30;
        const cost=current.cost+weight,state=next*3+axis;
        if(cost>=costs[state])continue;costs[state]=cost;parents[state]=current.state;heap.push({state,cost,priority:cost+heuristic(next)});
      }
    }
    if(found<0)throw new Error(`No clear ERD connector: ${connection.id}`);
    const route:number[]=[];for(let state=found;state>=0;state=parents[state])route.push(Math.floor(state/3));route.reverse();
    let reusedSegments=0;
    route.forEach((index,i)=>{pointsUsed[index]++;if(i){const key=segment(route[i-1],index);if(usage.has(key))reusedSegments++;usage.set(key,(usage.get(key)??0)+1);}});
    const lead=(port:Port)=>{
      const x=port.exit!.x+(port.side==='left'?2.5:-2.5);
      return [{x,y:port.point!.y},{x,y:port.exit!.y}];
    };
    const all=[start.point!,...(start.anchor?lead(start):[]),...route.map(point),...(end.anchor?lead(end).reverse():[]),end.point!];
    const corners=all.filter((p,i)=>i===0||i===all.length-1||!((all[i-1].x===p.x&&p.x===all[i+1].x)||(all[i-1].y===p.y&&p.y===all[i+1].y)));
    const path=corners.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' '),p=start.point!;
    const cardinality=connection.unique===null?'':start.side==='left'||start.side==='right'?
      connection.unique?`M${p.x+(start.side==='left'?-5:5)},${p.y-6} v12`:`M${p.x+(start.side==='left'?-10:10)},${p.y} L${p.x},${p.y-6} M${p.x+(start.side==='left'?-10:10)},${p.y} L${p.x},${p.y+6}`:
      connection.unique?`M${p.x-6},${p.y+(start.side==='top'?-5:5)} h12`:`M${p.x},${p.y+(start.side==='top'?-10:10)} L${p.x-6},${p.y} M${p.x},${p.y+(start.side==='top'?-10:10)} L${p.x+6},${p.y}`;
    const targetPoint=end.point!,dx=end.side==='left'?-5:5;
    const ending=cardinality+(end.anchor?` M${targetPoint.x+dx},${targetPoint.y-4} L${targetPoint.x},${targetPoint.y} L${targetPoint.x+dx},${targetPoint.y+4}`:'');
    return {...connection,path,ending,reusedSegments};
  });
}
