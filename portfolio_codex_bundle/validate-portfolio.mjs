import fs from 'node:fs';
import { createHash } from 'node:crypto';
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
assert(Array.isArray(d.profile.skillAreas) && d.profile.skillAreas.length===3,'three skill areas required');
unique(d.profile.skillAreas,'skill areas');
for(const area of d.profile.skillAreas){
  assert(/^[a-z-]+$/.test(area.id) && area.label?.trim() && area.title?.trim(),`invalid skill area ${area.id}`);
  assert(area.technologyIds.length>0 && new Set(area.technologyIds).size===area.technologyIds.length,`invalid skill technologies ${area.id}`);
  for(const id of area.technologyIds){
    assert(technologies.has(id) && bridge.contributionTechnology.some(link=>link.technologyId===id && contributions.has(link.contributionId)),`skill technology lacks linked work ${area.id}/${id}`);
  }
}
const presentation=d.presentation;
assert(presentation?.theme==='warm-ivory-cobalt','slide theme must be warm-ivory-cobalt');
assert(Array.isArray(presentation?.slides) && presentation.slides.length>2,'slide deck missing');
if(Array.isArray(presentation?.slides)){
  unique(presentation.slides,'slides');
  const workIds=[];
  for(const slide of presentation.slides){
    assert(/^[a-z][a-z-]*$/.test(slide.id),`unsafe slide id ${slide.id}`);
    assert(typeof slide.title==='string' && slide.title.trim(),`slide title missing ${slide.id}`);
    assert(['cover','contents','overview','work','closing'].includes(slide.type),`invalid slide type ${slide.id}`);
    assert(slide.projectId===null || projects.has(slide.projectId),`unknown slide project ${slide.id}`);
    assert(slide.diagramId===null || d.diagrams.some(item=>item.id===slide.diagramId && item.projectId===slide.projectId),`invalid slide diagram ${slide.id}`);
    for(const id of slide.contributionIds){
      assert(cmap.has(id) && cmap.get(id).projectId===slide.projectId,`invalid slide contribution ${slide.id}/${id}`);
      workIds.push(id);
    }
  }
  assert(new Set(workIds).size===workIds.length && fact.contributions.every(item=>workIds.includes(item.id)),'each contribution must appear once in deck');
}
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
  for(const item of p.implementationNotes??[]) assert(item.title?.trim() && item.body?.trim(),`empty implementation note ${p.id}`);
  for(const link of p.links??[]){
    assert(link.label?.trim() && /^https:\/\/(github\.com\/WJLee0417\/|wjlee0417\.github\.io\/)/.test(link.url),`invalid project link ${p.id}`);
  }
  if(p.comparison){
    const c=p.comparison;
    const safe=/^experiments\/drt\/\d{4}-\d{2}-\d{2}\/results\.json$/.test(c.artifactPath);
    assert(safe,`unsafe comparison artifact ${p.id}`);
    if(safe){
      const bytes=fs.readFileSync(new URL('../public/'+c.artifactPath,import.meta.url));
      assert(createHash('sha256').update(bytes).digest('hex')===c.artifactSha256,`comparison hash mismatch ${p.id}`);
      const result=JSON.parse(bytes);
      assert(result.visibility==='numeric_summary_only',`comparison must publish numerical summaries only ${p.id}`);
      assert(!/"(?:routes|events|logs|inputs|c_vhl|c_user|delta)"/.test(bytes.toString('utf8')),`private measurement fields in public comparison ${p.id}`);
      const folder=new URL('../public/'+c.artifactPath.replace('results.json',''),import.meta.url);
      assert(fs.readdirSync(folder).every(name=>['results.json','time-window.svg','time-window.png'].includes(name)),`raw inputs/logs must remain local ${p.id}`);
      assert(result.experiment_date===c.date && result.seeds.length===5 && result.iterations===5000 && result.fleet===2,`comparison conditions changed ${p.id}`);
      assert(new Set(result.seeds).size===result.seeds.length,`duplicate experiment seeds ${p.id}`);
      assert(c.rows.length===result.cases.length*3,`comparison row count mismatch ${p.id}`);
      const keys=new Set();
      for(const row of c.rows){
        const key=[row.caseId,row.variant,row.stage].join('/');assert(!keys.has(key),`duplicate comparison row ${key}`);keys.add(key);
        const entry=result.cases.find(item=>item.id===row.caseId);
        assert(Boolean(entry),`unknown comparison input ${row.caseId}`);if(!entry)continue;
        const runs=entry.runs.filter(run=>run.variant===row.variant);
        assert(JSON.stringify(runs.map(run=>run.seed).sort((a,b)=>a-b))===JSON.stringify([...result.seeds].sort((a,b)=>a-b)),`comparison seed mismatch ${key}`);
        const values=runs.map(run=>run[row.stage]);
        assert(values.every(Boolean) && values.length===row.runs,`comparison run count ${key}`);if(!values.every(Boolean))continue;
        const valid=values.filter(value=>value.feasible);
        const mean=valid.length?valid.reduce((s,v)=>s+v.objective,0)/valid.length:null;
        assert(row.feasibleRuns===valid.length && row.cost===mean,`comparison cost/validity mismatch ${key}`);
        assert(row.unassignedPassengers===Math.max(...values.map(v=>v.missing_passengers)) && row.servedPassengers===Math.min(...values.map(v=>v.served_passengers)) && row.totalPassengers===entry.passengers,`comparison coverage mismatch ${key}`);
        assert(valid.every(v=>v.issue_count===0 && v.unassigned_groups===0),`invalid feasible comparison ${key}`);
      }
      for(const entry of result.cases){
        assert(/^[A-Za-z0-9_]+$/.test(entry.id),`unsafe input name ${entry.id}`);
        if(/^[A-Za-z0-9_]+$/.test(entry.id)){
          assert(/^[0-9a-f]{64}$/.test(entry.input_sha256),`comparison input digest missing ${entry.id}`);
        }
      }
    }
    assert(/^experiments\/drt\/\d{4}-\d{2}-\d{2}\/time-window\.svg$/.test(c.figurePath) && fs.existsSync(new URL('../public/'+c.figurePath,import.meta.url)),`comparison image missing ${p.id}`);
  }
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
    if(e.source){
      const source=e.source;
      assert(e.kind==='SOURCE' && e.verificationStatus==='SOURCE_SUPPORTED',`invalid direct source type ${e.id}`);
      assert(source.repositoryUrl==='https://github.com/WJLee0417/RentalTrack',`unregistered direct source repository ${e.id}`);
      assert(/^[0-9a-f]{40}$/.test(source.revision) && /^[0-9a-f]{64}$/.test(source.sourceSha256),`invalid direct source provenance ${e.id}`);
      assert(/^[A-Za-z0-9_./-]+$/.test(source.path) && !source.path.split('/').includes('..'),`unsafe direct source path ${e.id}`);
      assert(e.url===`${source.repositoryUrl}/blob/${source.revision}/${source.path}` && !e.artifact,`direct source link mismatch ${e.id}`);
    }else if(e.result){
      assert(e.kind==='SOURCE' && e.verificationStatus==='SOURCE_SUPPORTED',`invalid result evidence ${e.id}`);
      const comparison=dim.projects.find(p=>p.id===e.projectId)?.comparison;
      assert(comparison && e.result.path===comparison.artifactPath && e.result.sha256===comparison.artifactSha256 && e.result.experimentDate===comparison.date,`result evidence provenance mismatch ${e.id}`);
      assert(e.url===`https://wjlee0417.github.io/${e.result.path}`,`result evidence URL mismatch ${e.id}`);
    }else assert(e.url===null && !e.artifact,`unregistered evidence link: ${e.id}`);
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
const personalCopy=[JSON.stringify(d.profile),...dim.projects.flatMap(p=>[p.role,p.summary,p.outcomeSummary]),...fact.contributions.flatMap(c=>[c.title,c.problem,c.decision,c.action,c.output])];
assert(!personalCopy.some(text=>text.includes('C++')),'C++ port must not be claimed as personal implementation without ownership confirmation');
const secretPattern=/(?:sk-[a-zA-Z0-9]{16,}|password\s*[:=]|jdbc:mysql:\/\/[^" ]+:[0-9]+)/i;
for(const project of dim.projects){
  const visual=project.visualization;
  assert(visual && ['erd','report-flow','routing'].includes(visual.kind),`project visual missing ${project.id}`);
  if(!visual)continue;
  assert(visual.title?.trim() && visual.summary?.trim(),`visual copy missing ${project.id}`);
  assert(visual.sources?.length>0 && visual.sources.every(source=>/^[0-9a-f]{64}$/.test(source.sha256) && (/^https:\/\/github\.com\/WJLee0417\/[A-Za-z0-9_.-]+\/blob\/[0-9a-f]{40}\//.test(source.url) || source.url==='https://wjlee0417.github.io/experiments/drt/2026-11-07/results.json')),`visual source missing ${project.id}`);
  if(visual.kind==='erd'){
    const tables=new Map(visual.tables.map(table=>[table.name,table]));
    assert(new Set(visual.tables.map(table=>table.displayName??table.name)).size===tables.size,`duplicate ERD table display name ${project.id}`);
    assert(tables.size===visual.tables.length && tables.size===(project.id==='P001'?7:17),`unexpected ERD table scope ${project.id}`);
    for(const table of visual.tables){
      if(project.id==='P001')assert(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(table.displayName??''),`English ERD table name missing ${table.name}`);
      const columns=new Set(table.columns.map(column=>column.name));
      const displayNames=table.columns.map(column=>column.displayName??column.name);
      assert(new Set(displayNames).size===displayNames.length,`duplicate ERD column display name ${table.name}`);
      if(project.id==='P001')assert(table.columns.every(column=>/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(column.displayName??'')),`English ERD column name missing ${table.name}`);
      assert(columns.size===table.columns.length && table.primaryKey.length>0,`ERD columns/PK invalid ${table.name}`);
      assert(table.columns.every(column=>typeof column.nullable==='boolean' && /^[A-Z]+(?:\(\d+(?:,\d+)?\))?(?: UNSIGNED)?$/.test(column.type)),`ERD column type invalid ${table.name}`);
      for(const key of [table.primaryKey,...table.uniqueKeys])assert(key.length>0 && key.every(name=>columns.has(name)),`ERD key references missing column ${table.name}`);
      assert(table.primaryKey.every(name=>!table.columns.find(column=>column.name===name)?.nullable),`ERD nullable PK ${table.name}`);
      for(const key of table.foreignKeys){
        const target=tables.get(key.target);
        assert(target && key.columns.length===key.targetColumns.length && key.columns.every(name=>columns.has(name)) && key.targetColumns.every(name=>target.columns.some(column=>column.name===name)),`ERD FK invalid ${table.name}`);
        if(target)assert([target.primaryKey,...target.uniqueKeys].some(columns=>columns.length===key.targetColumns.length && columns.every(name=>key.targetColumns.includes(name))),`ERD FK target must be unique ${table.name}`);
      }
    }
    const shown=new Set();
    for(const view of visual.views){const names=view.lanes.flat();assert(names.length===new Set(names).size && names.includes(view.focus) && names.every(name=>tables.has(name)),`ERD view invalid ${project.id}/${view.id}`);names.forEach(name=>shown.add(name));}
    assert(shown.size===tables.size,`unreachable ERD tables ${project.id}`);
    if(project.id==='P001')assert(JSON.stringify(tables.get('점포')?.primaryKey)===JSON.stringify(['서비스_업종_코드','상권_코드']),'commercial composite PK lost');
    if(project.id==='P004')assert(tables.get('member_credential')?.columns.find(column=>column.name==='password_hash')?.nullable===true,'V12 nullable credential missing');
  }else if(visual.kind==='report-flow'){
    const nodes=new Set(visual.nodes.map(node=>node.id));assert(nodes.size===visual.nodes.length,'duplicate flow node');
    for(const scenario of visual.scenarios){
      assert(scenario.path.every(id=>nodes.has(id)) && scenario.path[0]==='aggregate' && scenario.path.at(-1)==='response',`invalid flow route ${scenario.id}`);
      assert(scenario.httpStatus===(scenario.cacheHit?200:201) && scenario.generated!==scenario.cacheHit,`invalid API flags ${scenario.id}`);
      assert(scenario.providerCall===scenario.path.includes('provider'),`provider branch mismatch ${scenario.id}`);
      assert(scenario.source==='FALLBACK'?scenario.path.includes('fallback'):!scenario.path.includes('fallback'),`fallback branch mismatch ${scenario.id}`);
    }
    assert(visual.scenarios.find(s=>s.id==='normalize')?.source==='LLM','field normalization must preserve LLM source');
    assert(!visual.scenarios.find(s=>s.id==='force')?.path.includes('reuse'),'forceRefresh must skip reusable query');
  }else assert(project.comparison && visual.sources[0].sha256===project.comparison.artifactSha256,'routing visual must use measured summary');
}
assert(!secretPattern.test(JSON.stringify(d)),'possible private credential/contact in browser data');
if(errors.length){ console.error(`Validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);process.exitCode=1; }
else console.log(`OK: ${dim.projects.length} projects; ${dim.capabilities.length} capabilities; ${fact.contributions.length} contributions; ${fact.metricRecords.length} metrics; ${d.diagrams.length} diagrams; ${edges.size} capability-project edges; 11 tables`);
