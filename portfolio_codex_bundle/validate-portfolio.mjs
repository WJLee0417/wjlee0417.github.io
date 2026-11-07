import fs from 'node:fs';
const path = new URL('./portfolio-data.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(path, 'utf8'));
const evidenceLock = JSON.parse(fs.readFileSync(new URL('./evidence-artifacts.lock.json', import.meta.url), 'utf8'));
const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }
function unique(arr, label, key = x => x.id) {
  const keys = arr.map(key);
  assert(new Set(keys).size === keys.length, `duplicate ${label}`);
  return new Set(keys);
}
const dim=d.dimensions, fact=d.facts, bridge=d.bridges;
assert(typeof d.profile.intro==='string' && d.profile.intro.trim(),'profile work introduction missing');
assert(d.meta.contentLock==='LOCKED','content lock missing');
assert(dim.projects.length===4,'must have 4 projects');
assert(dim.capabilities.length===8,'must have 8 capabilities');
assert(dim.processes.length===7,'must have 7 processes');
assert(fact.contributions.length===25,'must have 25 contributions');
assert(fact.metricRecords.length===9,'must have 9 numeric metric records');
assert(d.logicalSchema.length===11,'must have 11 logical tables');
assert(d.diagrams.length===12,'must have 12 diagrams');
const projects=unique(dim.projects,'projects'), capabilities=unique(dim.capabilities,'capabilities');
const processes=unique(dim.processes,'processes'), technologies=unique(dim.technologies,'technologies');
const metrics=unique(dim.metrics,'metric definitions'), evidence=unique(dim.evidence,'evidence');
const contributions=unique(fact.contributions,'contributions'), mrecords=unique(fact.metricRecords,'metric records');
unique(d.logicalSchema,'schema tables', x=>x.name);unique(d.diagrams,'diagrams');
const cmap=new Map(fact.contributions.map(c=>[c.id,c]));
const technologyGroups=['Java / Backend','Python / Data','SQL / Database','Optimization','Interface / Tools'];
for(const t of dim.technologies){
  assert(technologyGroups.includes(t.group),`invalid technology group ${t.id}`);
  assert(Number.isInteger(t.groupOrder) && Number.isInteger(t.displayOrder),`invalid technology sort order ${t.id}`);
  assert(typeof t.category==='string' && t.category.trim(),`missing technology type ${t.id}`);
  for(const [projectId,order] of Object.entries(t.featuredOrderByProject??{})){
    assert(projects.has(projectId),`unknown featured technology project ${t.id}/${projectId}`);
    assert(Number.isInteger(order) && order>0,`invalid featured technology order ${t.id}/${projectId}`);
    assert(bridge.contributionTechnology.some(b=>b.technologyId===t.id && cmap.get(b.contributionId)?.projectId===projectId),`featured technology has no personal work ${t.id}/${projectId}`);
  }
}
const heroTechnologies=dim.technologies.filter(t=>t.heroOrder!==undefined).sort((a,b)=>a.heroOrder-b.heroOrder);
assert(heroTechnologies.length===6 && new Set(heroTechnologies.map(t=>t.heroOrder)).size===6,'hero must have six ordered technologies');
assert(heroTechnologies.map(t=>t.id).join(',')==='T009,T010,T002,T003,T005,T004','hero technology selection changed');
for(const [projectId,expected] of Object.entries({P001:['T001','T002','T005','T004'],P002:['T002','T003','T007','T008'],P003:['T009','T010','T011','T004'],P004:[]})){
  const actual=dim.technologies.filter(t=>t.featuredOrderByProject?.[projectId]!==undefined).sort((a,b)=>a.featuredOrderByProject[projectId]-b.featuredOrderByProject[projectId]).map(t=>t.id);
  assert(actual.join(',')===expected.join(','),`featured technology selection changed ${projectId}`);
}
for (const p of dim.projects){
  assert(Object.hasOwn(d.pages,p.id),`page missing: ${p.id}`);
  const pages=new Set(d.pages[p.id]?.sections.map(s=>s.id));
  for(const id of p.featuredContributionIds) assert(cmap.get(id)?.projectId===p.id,`featured contribution invalid ${p.id}/${id}`);
  for (const c of fact.contributions.filter(c=>c.projectId===p.id)) assert(pages.has(c.sectionAnchor),`bad anchor ${c.id} ${c.sectionAnchor}`);
}
for(const c of fact.contributions){
  assert(projects.has(c.projectId),`contribution unknown project ${c.id}`);
  assert(capabilities.has(c.capabilityId),`contribution unknown capability ${c.id}`);
  assert(processes.has(c.processId),`contribution unknown process ${c.id}`);
  assert(c.ownership==='DIRECT',`non-direct work included ${c.id}`);
  for (const field of ['problem','decision','action','output']) assert(typeof c[field]==='string' && c[field].trim(),`missing ${field}: ${c.id}`);
}
for(const r of fact.metricRecords){
  assert(projects.has(r.projectId),`bad metric project ${r.id}`);
  assert(metrics.has(r.metricId),`bad metric definition ${r.id}`);
  assert(typeof r.numericValue==='number' && Number.isFinite(r.numericValue),`non-numeric metric ${r.id}`);
  assert(typeof r.context==='string' && r.context.trim(),`metric missing context ${r.id}`);
}
const repository=d.meta.evidenceRepository;
assert(repository?.repositoryUrl==='https://github.com/WJLee0417/wjlee0417.github.io','invalid evidence repository');
assert(repository?.branch==='codex/portfolio-evidence','invalid evidence branch');
assert(/^[0-9a-f]{40}$/.test(repository?.revision??''),'evidence revision must be a full commit');
assert(repository?.revision===evidenceLock.revision && repository?.branch===evidenceLock.branch,'evidence lock revision mismatch');
const artifactMap=new Map(evidenceLock.artifacts.map(a=>[a.evidenceId,a]));
assert(artifactMap.size===evidenceLock.artifacts.length,'duplicate evidence artifact ids');
for(const e of dim.evidence){
  assert(projects.has(e.projectId),`bad evidence project: ${e.id}`);
  assert(e.publicAssetPath===null,`unregistered public asset: ${e.id}`);
  const artifact=artifactMap.get(e.id);
  if(!artifact){
    assert(e.url===null && !e.artifact,`unregistered evidence link: ${e.id}`);
    continue;
  }
  assert(artifact.projectId===e.projectId && artifact.kind===e.kind,`artifact scope mismatch: ${e.id}`);
  assert(/^projects\/P\d{3}\/[A-Za-z0-9_./-]+$/.test(artifact.path) && !artifact.path.split('/').some(p=>p==='.'||p==='..'),`unsafe evidence path: ${e.id}`);
  assert(/^[0-9a-f]{64}$/.test(artifact.sha256),`invalid artifact hash: ${e.id}`);
  assert(e.url===`${repository.repositoryUrl}/blob/${repository.revision}/${artifact.path}`,`evidence link must match pinned artifact: ${e.id}`);
  assert(e.artifact?.path===artifact.path && e.artifact?.sha256===artifact.sha256 && e.artifact?.origin===artifact.origin,`artifact metadata mismatch: ${e.id}`);
  if(artifact.origin==='RECONSTRUCTED_DESIGN') assert(e.kind==='DESIGN' && e.verificationStatus==='RECONSTRUCTED_DESIGN',`design cannot be presented as historical source: ${e.id}`);
  else {
    assert(artifact.origin==='UPSTREAM_SOURCE' && e.kind==='SOURCE',`invalid source artifact type: ${e.id}`);
    assert(['https://github.com/WJLee0417/SSAFIT_Playlist','https://github.com/WJLee0417/Franchise_Recommendation_DB'].includes(artifact.source?.repositoryUrl),`unregistered upstream source: ${e.id}`);
    assert(/^[0-9a-f]{40}$/.test(artifact.source?.revision??'') && /^[0-9a-f]{64}$/.test(artifact.source?.sourceSha256??''),`invalid upstream provenance: ${e.id}`);
    assert(JSON.stringify(e.artifact?.source)===JSON.stringify(artifact.source),`upstream metadata mismatch: ${e.id}`);
  }
}
assert([...artifactMap.keys()].every(id=>evidence.has(id)),'artifact refers to missing evidence');
for(const [name,rows,keys,refs] of [
 ['contributionTechnology',bridge.contributionTechnology,['contributionId','technologyId'],[contributions,technologies]],
 ['contributionEvidence',bridge.contributionEvidence,['contributionId','evidenceId'],[contributions,evidence]],
 ['metricEvidence',bridge.metricEvidence,['metricRecordId','evidenceId'],[mrecords,evidence]]
]){
  unique(rows, name, r=>keys.map(k=>r[k]).join('::'));
  for(const r of rows) keys.forEach((k,i)=>assert(refs[i].has(r[k]),`invalid ${name} ${k}:${r[k]}`));
}
const evidenceMap=new Map(dim.evidence.map(e=>[e.id,e]));
const recordMap=new Map(fact.metricRecords.map(r=>[r.id,r]));
for(const b of bridge.contributionEvidence) assert(cmap.get(b.contributionId).projectId===evidenceMap.get(b.evidenceId).projectId,`cross-project evidence ${b.contributionId}`);
for(const b of bridge.metricEvidence) assert(recordMap.get(b.metricRecordId).projectId===evidenceMap.get(b.evidenceId).projectId,`cross-project metric evidence ${b.metricRecordId}`);
for(const x of d.diagrams){
  assert(projects.has(x.projectId),`diagram unknown project ${x.id}`);
  assert(d.pages[x.projectId].sections.some(s=>s.id===x.sectionAnchor),`diagram bad anchor ${x.id}`);
  assert(typeof x.disclosure==='string' && x.disclosure.trim(),`diagram disclosure missing ${x.id}`);
  assert(typeof x.caption==='string' && x.caption.trim(),`diagram caption missing ${x.id}`);
  if(x.relationships){
    const entities=new Set(x.entities??[]);
    const pairs=new Set();
    for(const r of x.relationships){
      assert(r.length===3 && r.every(v=>typeof v==='string' && v.trim()),`invalid diagram relationship ${x.id}`);
      assert(entities.has(r[0]) && entities.has(r[1]),`diagram relationship references missing entity ${x.id}`);
      const pair=[r[0],r[1]].sort().join('::');
      assert(!pairs.has(pair),`duplicate diagram relationship ${x.id}/${pair}`);
      pairs.add(pair);
    }
  }
}
const edges = new Set(fact.contributions.map(c=>`${c.capabilityId}:${c.projectId}`));
const wanted=['C001:P001','C002:P001','C002:P004','C003:P001','C003:P002','C003:P003','C005:P002','C006:P002','C006:P003','C007:P003','C008:P004'];
assert(edges.size===11 && wanted.every(e=>edges.has(e)),`capability network not as agreed: ${[...edges].join(',')}`);
assert(!fact.contributions.some(c=>c.capabilityId==='C004'),'C004 must have no unsupported contributions');
assert(!fact.metricRecords.some(r=>r.projectId==='P004'),'P004 must not have invented numeric results');
assert(!bridge.contributionTechnology.some(b=>cmap.get(b.contributionId).projectId==='P004'),'P004 personal tech must not be inferred');
const badP001=/코사인|유사도 계산|Folium|지도 시각화|추천 점수 계산|추천 점수식|36개 특성|36개 상권 특성/;
for(const c of fact.contributions.filter(c=>c.projectId==='P001')){
  const s=JSON.stringify(c);assert(!badP001.test(s),`P001 team-only work entered personal contribution: ${c.id}`);
}
assert(!JSON.stringify(d).includes('C++'),'avoid non-personal implementation language in personal portfolio data');
const secretPattern=/(?:sk-[a-zA-Z0-9]{16,}|password\s*[:=]|jdbc:mysql:\/\/[^" ]+:[0-9]+)/i;
assert(!secretPattern.test(JSON.stringify(d)),'possible private credential/contact in browser data');
if(errors.length){ console.error(`Validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);process.exitCode=1; }
else console.log(`OK: ${dim.projects.length} projects; ${dim.capabilities.length} capabilities; ${fact.contributions.length} contributions; ${fact.metricRecords.length} metrics; ${d.diagrams.length} diagrams; ${edges.size} capability-project edges; 11 tables`);
