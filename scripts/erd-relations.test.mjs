import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
const source=ts.transpileModule(readFileSync(new URL('../src/erd-relations.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports','module',source)(module.exports,module);
const {erdRelations,crossingBridges}=module.exports;
const data=JSON.parse(readFileSync(new URL('../portfolio_codex_bundle/portfolio-data.json',import.meta.url),'utf8'));

test('every RentalTrack FK has an independent, stable name and number',()=>{
 const model=data.dimensions.projects.find(p=>p.id==='P004').visualization,relations=erdRelations(model);
 assert.equal(relations.length,20);assert.equal(new Set(relations.map(r=>r.id)).size,20);
 const intake=relations.find(r=>r.columns.includes('intake_condition_id')),returned=relations.find(r=>r.columns.includes('return_condition_id'));
 assert.equal(intake.name,'인수기준이 된다');assert.equal(returned.name,'반납대상이 된다');assert.notEqual(intake.id,returned.id);
 for(const view of model.views){const names=view.lanes.flat();for(const r of relations.filter(r=>names.includes(r.child.name)&&names.includes(r.parent.name)))assert.equal(r.id,erdRelations(model).find(item=>item.key===r.key).id);}
});

test('only perpendicular crossings get a local bridge, not parallel lines',()=>{
 const a={id:'horizontal',path:'M10,50 L90,50'},b={id:'vertical',path:'M50,10 L50,90'},parallel={id:'parallel',path:'M10,53 L90,53'};
 assert.deepEqual(crossingBridges([a,b]).get('vertical'),['M50,46 V54']);
 assert.deepEqual(crossingBridges([a,parallel]).get('parallel'),[]);
 assert.deepEqual(crossingBridges([b,a]).get('horizontal'),['M46,50 H54']);
});

test('touching endpoints and bends are not drawn as false crossings',()=>{
 assert.deepEqual(crossingBridges([{id:'a',path:'M10,50 L50,50'},{id:'b',path:'M50,50 L50,90'}]).get('b'),[]);
});
