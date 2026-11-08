import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
const source=ts.transpileModule(readFileSync(new URL('../src/erd-routing.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports','module',source)(module.exports,module);
const {routeErdConnections}=module.exports;
const data=JSON.parse(readFileSync(new URL('../portfolio_codex_bundle/portfolio-data.json',import.meta.url),'utf8'));
const overviewModule={exports:{}};
new Function('exports','module',ts.transpileModule(readFileSync(new URL('../src/erd-overview.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(overviewModule.exports,overviewModule);
test('overview keeps every PK/FK and shows actual ordinary fields',()=>{
 for(const project of data.dimensions.projects.filter(p=>p.visualization?.kind==='erd'))for(const table of project.visualization.tables){
  const shown=overviewModule.exports.overviewColumns(table),names=shown.map(c=>c.name),keys=new Set([...table.primaryKey,...table.foreignKeys.flatMap(key=>key.columns)]);
  for(const key of keys)assert.ok(names.includes(key));
  const attributes=table.columns.filter(c=>!keys.has(c.name));
  if(attributes.length)assert.ok(shown.some(c=>!keys.has(c.name)));
  assert.deepEqual(overviewModule.exports.overviewColumns(table,true),table.columns);
 }
});

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
  const edges=project.visualization.tables.filter(t=>boxes.has(t.name)).flatMap(t=>t.foreignKeys.flatMap((key,index)=>boxes.has(key.target)?[{id:t.name+'-'+index,parent:key.target,child:t.name,unique:false,label:key.columns.join(',')}]:[]));
  const width=80+view.lanes.length*460+(view.lanes.length-1)*96,height=Math.max(...[...boxes.values()].map(b=>b.y+b.height))+40;
  const routes=routeErdConnections(boxes,edges,width,height);
  assert.equal(routes.length,edges.length);check(routes,boxes);
 });
}
test('parallel relationships use distinct ports',()=>{
 const boxes=new Map([['a',{x:30,y:30,width:180,height:160}],['b',{x:300,y:30,width:180,height:160}]]);
 const edges=[0,1,2,3].map(i=>({id:String(i),parent:'a',child:'b',unique:i===0,label:'parallel'}));
 const routes=routeErdConnections(boxes,edges,510,220);assert.equal(new Set(routes.map(r=>r.path)).size,4);check(routes,boxes);
});
