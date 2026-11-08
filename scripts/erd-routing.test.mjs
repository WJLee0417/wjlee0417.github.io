import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
const source=ts.transpileModule(readFileSync(new URL('../src/erd-routing.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports','module',source)(module.exports,module);
const {routeErdConnections}=module.exports;
const data=JSON.parse(readFileSync(new URL('../portfolio_codex_bundle/portfolio-data.json',import.meta.url),'utf8'));

function segments(path){
 const values=path.match(/-?\d+(?:\.\d+)?/g).map(Number),result=[];
 for(let i=2;i<values.length;i+=2)result.push({x1:values[i-2],y1:values[i-1],x2:values[i],y2:values[i+1]});
 return result;
}
function overlap(a,b){
 return a.x1===a.x2&&b.x1===b.x2&&a.x1===b.x1&&Math.min(Math.max(a.y1,a.y2),Math.max(b.y1,b.y2))>Math.max(Math.min(a.y1,a.y2),Math.min(b.y1,b.y2))+.1 ||
 a.y1===a.y2&&b.y1===b.y2&&a.y1===b.y1&&Math.min(Math.max(a.x1,a.x2),Math.max(b.x1,b.x2))>Math.max(Math.min(a.x1,a.x2),Math.min(b.x1,b.x2))+.1;
}
function check(routes,boxes){
 assert.ok(routes.every(route=>route.reusedSegments===0));
 const lines=routes.flatMap((route,edge)=>segments(route.path).map(segment=>({...segment,edge})));
 for(const line of lines){
  assert.ok(line.x1===line.x2||line.y1===line.y2,'connector must be orthogonal');
  for(const box of boxes.values()){
   const vertical=line.x1===line.x2;
   const through=vertical?line.x1>box.x+.1&&line.x1<box.x+box.width-.1&&Math.min(Math.max(line.y1,line.y2),box.y+box.height)>Math.max(Math.min(line.y1,line.y2),box.y)+.1:
     line.y1>box.y+.1&&line.y1<box.y+box.height-.1&&Math.min(Math.max(line.x1,line.x2),box.x+box.width)>Math.max(Math.min(line.x1,line.x2),box.x)+.1;
   assert.equal(through,false,'connector crosses an entity');
  }
 }
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++)if(lines[i].edge!==lines[j].edge)assert.equal(overlap(lines[i],lines[j]),false,'distinct relationships share a line segment');
}

for(const project of data.dimensions.projects.filter(p=>p.visualization?.kind==='erd'))for(const view of project.visualization.views){
 test(`${project.id}/${view.id}: every FK is separate and avoids detailed entities`,()=>{
  const boxes=new Map();
  for(const [column,lane] of view.lanes.entries()){
   let y=40;
   for(const name of lane){const table=project.visualization.tables.find(t=>t.name===name),height=102+table.columns.length*50;boxes.set(name,{x:40+column*556,y,width:460,height});y+=height+85;}
  }
  const edges=project.visualization.tables.filter(t=>boxes.has(t.name)).flatMap(t=>t.foreignKeys.flatMap((key,index)=>{
   if(!boxes.has(key.target))return [];
   const parent=project.visualization.tables.find(t=>t.name===key.target);
   return key.columns.map((column,pair)=>({id:t.name+'-'+index+'-'+pair,parent:key.target,child:t.name,unique:false,label:key.columns.join(','),parentColumn:key.targetColumns[pair],childColumn:column,parentAnchor:{y:boxes.get(key.target).y+72+parent.columns.findIndex(c=>c.name===key.targetColumns[pair])*50+15,height:30},childAnchor:{y:boxes.get(t.name).y+72+t.columns.findIndex(c=>c.name===column)*50+15,height:30}}));
  }));
  const width=80+view.lanes.length*460+(view.lanes.length-1)*96,height=Math.max(...[...boxes.values()].map(b=>b.y+b.height))+40;
  const routes=routeErdConnections(boxes,edges,width,height);
  assert.equal(routes.length,edges.length);check(routes,boxes);
  for(const route of routes){const line=segments(route.path),start=line[0],end=line.at(-1);assert.ok(Math.abs(start.y1-route.childAnchor.y)<route.childAnchor.height/2);assert.ok(Math.abs(end.y2-route.parentAnchor.y)<route.parentAnchor.height/2);assert.ok([boxes.get(route.child).x,boxes.get(route.child).x+boxes.get(route.child).width].includes(start.x1));assert.ok([boxes.get(route.parent).x,boxes.get(route.parent).x+boxes.get(route.parent).width].includes(end.x2));}
 });
}
test('parallel relationships use distinct ports',()=>{
 const boxes=new Map([['a',{x:30,y:30,width:180,height:160}],['b',{x:300,y:30,width:180,height:160}]]);
 const edges=[0,1,2,3].map(i=>({id:String(i),parent:'a',child:'b',unique:i===0,label:'parallel'}));
 const routes=routeErdConnections(boxes,edges,510,220);assert.equal(new Set(routes.map(r=>r.path)).size,4);check(routes,boxes);
});
test('multiple FKs terminate in the same PK row without shared segments',()=>{
 const boxes=new Map([['parent',{x:30,y:30,width:180,height:210}],['child',{x:300,y:30,width:180,height:210}]]);
 const edges=[0,1,2,3].map(i=>({id:String(i),parent:'parent',child:'child',unique:false,label:'FK to shared PK',parentColumn:'id',childColumn:'fk_'+i,parentAnchor:{y:90,height:21},childAnchor:{y:70+i*40,height:21}}));
 const routes=routeErdConnections(boxes,edges,520,280);check(routes,boxes);
 for(const route of routes){const line=segments(route.path);assert.equal(line[0].y1,route.childAnchor.y);assert.ok(Math.abs(line.at(-1).y2-90)<10.5);}
});
test('composite FK column pairs retain their referenced column anchors',()=>{
 const boxes=new Map([['parent',{x:30,y:30,width:180,height:210}],['child',{x:300,y:30,width:180,height:210}]]);
 const pairs=[['area_id','area_id',80,140],['industry_id','industry_id',120,100]];
 const edges=pairs.map(([childColumn,parentColumn,sourceY,targetY],i)=>({id:String(i),parent:'parent',child:'child',unique:true,label:'composite',childColumn,parentColumn,childAnchor:{y:sourceY,height:21},parentAnchor:{y:targetY,height:21}}));
 const routes=routeErdConnections(boxes,edges,520,280);check(routes,boxes);
 for(const route of routes){const line=segments(route.path);assert.equal(line[0].y1,route.childAnchor.y);assert.equal(line.at(-1).y2,route.parentAnchor.y);}
});
