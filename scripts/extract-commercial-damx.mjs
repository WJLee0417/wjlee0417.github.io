import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// This reader supports this supplied DA# archive, not arbitrary DAMX versions.
export const modelSha256='0fd22beb5239b071b39035deb3adb1485cc4261a07283927d3bca75f4d3de1b0';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const tableName=/^(SRC|DIM|FACT)_[A-Z_]+$/;
const columnName=/^[a-z][a-z0-9_]*$/;
const dataType=/^(?:BIGINT(?: UNSIGNED)?|INT|SMALLINT|TINYINT|VARCHAR|CHAR|DATETIME|DECIMAL|DATE|TEXT|LONGTEXT|TIMESTAMP)$/;

export function extractCommercialDamx(bytes){
  assert.equal(createHash('sha256').update(bytes).digest('hex'),modelSha256,'Unsupported DAMX archive; review the reader before using another revision');
  const strings=[];
  for(let offset=0;offset<bytes.length-4;offset++){
    if(bytes[offset]!==255||bytes[offset+1]!==254||bytes[offset+2]!==255)continue;
    let cursor=offset+3,length=bytes[cursor++];
    if(length===255){length=bytes.readUInt16LE(cursor);cursor+=2;if(length===65535){length=bytes.readUInt32LE(cursor);cursor+=4;}}
    const end=cursor+length*2;
    if(length>20000||end>bytes.length)continue;
    const text=bytes.subarray(cursor,end).toString('utf16le');
    if(!text.includes('\0'))strings.push({offset,text});
    offset=end-1;
  }
  const entities=strings.flatMap((s,i)=>strings[i+1]?.text==='FileReverse'&&uuid.test(strings[i-1]?.text)?[{id:strings[i-1].text,name:s.text,offset:s.offset,index:i}]:[]);
  const physical=entities.filter(e=>tableName.test(e.name));
  const logical=entities.filter(e=>!tableName.test(e.name)&&e.offset<physical[0].offset);
  assert.equal(physical.length,49);assert.equal(logical.length,49);
  function relations(entities){
    const map=new Map(entities.map(e=>[e.id,e]));
    return strings.flatMap((s,i)=>uuid.test(s.text)&&map.has(strings[i+1]?.text)&&map.has(strings[i+2]?.text)&&strings[i+3]?.text===s.text?[{
      id:s.text,parent:map.get(strings[i+1].text),child:map.get(strings[i+2].text),
      name:strings[i+4].text,offset:s.offset,tail:strings.slice(i+5).filter(s=>s.text).slice(0,3),
    }]:[]);
  }
  const physicalRelations=relations(physical),logicalRelations=relations(logical);
  assert.equal(physicalRelations.length,48);assert.equal(logicalRelations.length,48);
  const logicalNames=new Map(logical.map(e=>[e.id,strings.slice(e.index+2).find(s=>tableName.test(s.text)).text]));
  const labels=new Map(logical.map(e=>[logicalNames.get(e.id),e.name]));
  const tables=physical.map((e,n)=>{
    const next=physical[n+1],end=next?strings[next.index-2].offset:physicalRelations[0].offset;
    const block=strings.filter(s=>s.offset>=e.offset&&s.offset<end),attributes=[];
    for(let i=0;i<block.length-3;i++)if(block[i].text===e.name&&columnName.test(block[i+1].text)&&dataType.test(block[i+2].text)){
      const prior=block.slice(0,i).findLastIndex((s,j,a)=>uuid.test(s.text)&&a[j+1]?.text===s.text);
      assert.ok(prior>=0,`Missing attribute identity: ${e.name}/${block[i+1].text}`);
      const name=block[i+1].text,base=block[i+2].text,size=block[i+3].text;
      const parameterized=['DECIMAL','VARCHAR','CHAR','DATETIME','TIMESTAMP'].includes(base)&&/^\d+(?:,\d+)?$/.test(size);
      assert.ok(!attributes.some(c=>c.name===name),`Duplicate physical attribute ${e.name}/${name}`);
      attributes.push({id:block[prior].text,name,label:block.slice(prior,i).filter(s=>/[가-힣]/.test(s.text)).at(-1)?.text??name,type:base+(parameterized?`(${size})`:''),nullable:null,sourceOffset:block[i+1].offset});
    }
    const pk=block.findIndex(s=>s.text===e.name+'_PK');
    assert.ok(pk>=0,`Missing model PK index: ${e.name}`);
    const primaryKey=[...new Set(block.slice(pk+1).filter(s=>attributes.some(c=>c.id===s.text)).map(s=>attributes.find(c=>c.id===s.text).name))];
    return {name:e.name,label:labels.get(e.name),columns:attributes.map(({id,...c})=>c),primaryKey,uniqueKeys:[],foreignKeys:[],sourceOffset:e.offset};
  }).sort((a,b)=>a.name.localeCompare(b.name));
  for(const relation of physicalRelations){
    const parent=tables.find(t=>t.name===relation.parent.name),child=tables.find(t=>t.name===relation.child.name);
    assert.equal(parent.primaryKey.length,1,'This archive has single-column dimension PKs');
    const logicalMatches=logicalRelations.filter(l=>logicalNames.get(l.parent.id)===parent.name&&logicalNames.get(l.child.id)===child.name&&l.name===relation.name);
    assert.equal(logicalMatches.length,1,`Ambiguous logical relationship ${relation.id}`);
    const logicalRelation=logicalMatches[0];
    // A role alias distinguishes observation_period_key from period_key. The
    // archive contains five unresolved key-object references; for those, use
    // the explicit endpoint tables and their sole identically named key only.
    const matchingAlias=logicalRelation.tail[0]?.text===relation.tail[0]?.text?logicalRelation.tail[2]?.text:undefined;
    const roleMatches=child.columns.filter(c=>c.label===matchingAlias);
    const columns=roleMatches.length===1?[roleMatches[0].name]:parent.primaryKey.filter(name=>child.columns.some(c=>c.name===name));
    assert.equal(columns.length,1,`Unresolved relationship column ${relation.id}`);
    child.foreignKeys.push({columns,target:parent.name,targetColumns:parent.primaryKey,relationshipName:relation.name,cardinality:'unspecified',sourceId:relation.id,sourceOffset:relation.offset,columnMapping:roleMatches.length===1?'logical-role-alias':'identical-key-name'});
  }
  const physicalPairs=new Set(tables.flatMap(t=>t.columns.map(c=>`${t.name}.${c.name}:${c.type}`)));
  const logicalPairs=new Set();
  for(let i=0;i<strings.length-3&&strings[i].offset<physical[0].offset;i++){
    const [table,column,type,size]=strings.slice(i,i+4).map(s=>s.text);
    if(!tableName.test(table)||!columnName.test(column)||!dataType.test(type))continue;
    const params=['DECIMAL','VARCHAR','CHAR','DATETIME','TIMESTAMP'].includes(type)&&/^\d+(?:,\d+)?$/.test(size)?`(${size})`:'';
    logicalPairs.add(`${table}.${column}:${type}${params}`);
  }
  assert.equal(physicalPairs.size,621);assert.deepEqual(physicalPairs,logicalPairs,'Logical and physical column definitions disagree');
  const counts=Object.fromEntries(['SRC','DIM','FACT'].map(prefix=>{const group=tables.filter(t=>t.name.startsWith(prefix+'_'));return [prefix,{tables:group.length,columns:group.reduce((n,t)=>n+t.columns.length,0)}];}));
  assert.deepEqual(counts,{SRC:{tables:21,columns:367},DIM:{tables:10,columns:98},FACT:{tables:18,columns:156}});
  return {source:{kind:'DAMX',fileName:'상권분석ERD.damx',sha256:modelSha256},counts,relationshipCount:physicalRelations.length,namedRelationshipCount:physicalRelations.filter(r=>r.name).length,
    extraction:{nullable:'not-decoded',cardinality:'not-decoded',additionalUniqueKeys:'not-decoded',columnCheck:'logical-and-physical-definitions-match',relationshipMapping:'explicit-table-endpoints; logical role alias or sole identical key name; not executed SQL constraints'},tables};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const input=process.argv[2];assert.ok(input,'Usage: node scripts/extract-commercial-damx.mjs <original.damx> [--check]');
  const model=extractCommercialDamx(readFileSync(input)),output=new URL('../public/models/commercial-district.damx.json',import.meta.url);
  if(process.argv.includes('--check'))assert.deepEqual(model,JSON.parse(readFileSync(output,'utf8')));
  else writeFileSync(output,JSON.stringify(model,null,2)+'\n');
  console.log(`PASS: DAMX ${model.tables.length} tables / 621 columns / ${model.relationshipCount} relationships (${model.namedRelationshipCount} named); logical/physical definitions cross-checked.`);
}
