import type { PortfolioData, Contribution, Project, Technology, MetricRecord, Evidence } from './portfolio-types';

/** All relationships are derived; the UI must not maintain a second hard-coded matrix. */
export function getContributionsByProject(data: PortfolioData, projectId: string): Contribution[] {
  return data.facts.contributions.filter(c => c.projectId === projectId && c.ownership === 'DIRECT');
}
export function getContributionsByCapability(data: PortfolioData, capabilityId: string): Contribution[] {
  return data.facts.contributions.filter(c => c.capabilityId === capabilityId && c.ownership === 'DIRECT');
}
export function getContributionsByConnection(data: PortfolioData, projectId: string, capabilityId: string): Contribution[] {
  return data.facts.contributions.filter(c => c.projectId === projectId && c.capabilityId === capabilityId && c.ownership === 'DIRECT');
}
export function getProjectsByCapability(data: PortfolioData, capabilityId: string): Project[] {
  const projectIds = new Set(getContributionsByCapability(data, capabilityId).map(c => c.projectId));
  return data.dimensions.projects.filter(p => projectIds.has(p.id)).sort((a,b) => a.sortOrder-b.sortOrder);
}
export function getCapabilitiesByProject(data: PortfolioData, projectId: string) {
  const ids = new Set(getContributionsByProject(data,projectId).map(c=>c.capabilityId));
  return data.dimensions.capabilities.filter(c=>ids.has(c.id));
}
export function getTechnologiesByContribution(data: PortfolioData, contributionId: string): Technology[] {
  const ids=new Set(data.bridges.contributionTechnology.filter(b=>b.contributionId===contributionId).map(b=>b.technologyId));
  return data.dimensions.technologies.filter(t=>ids.has(t.id));
}
export function getTechnologiesByProject(data: PortfolioData, projectId: string): Technology[] {
  const conIds=new Set(getContributionsByProject(data,projectId).map(c=>c.id));
  const techIds=new Set(data.bridges.contributionTechnology.filter(b=>conIds.has(b.contributionId)).map(b=>b.technologyId));
  return sortTechnologies(data.dimensions.technologies.filter(t=>techIds.has(t.id)));
}
export function sortTechnologies(technologies: Technology[]): Technology[] {
  return [...technologies].sort((a,b)=>a.groupOrder-b.groupOrder || a.displayOrder-b.displayOrder);
}
export function getFeaturedTechnologiesByProject(data: PortfolioData, projectId: string): Technology[] {
  return getTechnologiesByProject(data,projectId).filter(t=>t.featuredOrderByProject?.[projectId]!==undefined).sort((a,b)=>a.featuredOrderByProject![projectId]-b.featuredOrderByProject![projectId]);
}
export function getDetailTechnologiesByProject(data: PortfolioData, projectId: string): Technology[] {
  return getTechnologiesByProject(data,projectId).filter(t=>t.featuredOrderByProject?.[projectId]===undefined);
}
export function getHeroTechnologies(data: PortfolioData): Technology[] {
  const linkedIds=new Set(data.bridges.contributionTechnology.map(b=>b.technologyId));
  return data.dimensions.technologies.filter(t=>t.heroOrder!==undefined && linkedIds.has(t.id)).sort((a,b)=>a.heroOrder!-b.heroOrder!);
}
export function getTechnologyGroups(data: PortfolioData): Array<{label: Technology['group']; order: number}> {
  const linkedIds=new Set(data.bridges.contributionTechnology.map(b=>b.technologyId));
  const groups=new Map<Technology['group'],number>();
  for(const t of data.dimensions.technologies.filter(t=>linkedIds.has(t.id))) groups.set(t.group,t.groupOrder);
  return [...groups].map(([label,order])=>({label,order})).sort((a,b)=>a.order-b.order);
}
export function getProjectsByTechnology(data: PortfolioData, technologyId: string): Project[] {
  const conIds=new Set(data.bridges.contributionTechnology.filter(b=>b.technologyId===technologyId).map(b=>b.contributionId));
  const projIds=new Set(data.facts.contributions.filter(c=>conIds.has(c.id)&&c.ownership==='DIRECT').map(c=>c.projectId));
  return data.dimensions.projects.filter(p=>projIds.has(p.id)).sort((a,b)=>a.sortOrder-b.sortOrder);
}
export function getContributionsByTechnologyProject(data: PortfolioData, technologyId: string, projectId: string): Contribution[] {
  const conIds=new Set(data.bridges.contributionTechnology.filter(b=>b.technologyId===technologyId).map(b=>b.contributionId));
  return getContributionsByProject(data,projectId).filter(c=>conIds.has(c.id));
}
export function getEvidenceByContribution(data: PortfolioData, contributionId: string): Evidence[] {
  const ids = new Set(data.bridges.contributionEvidence.filter(b=>b.contributionId===contributionId).map(b=>b.evidenceId));
  return data.dimensions.evidence.filter(e=>ids.has(e.id));
}
export function getMetricsByProject(data: PortfolioData, projectId: string): Array<MetricRecord & { label: string; unit: string; category: string }> {
  const definitions = new Map(data.dimensions.metrics.map(m=>[m.id,m]));
  return data.facts.metricRecords.filter(r=>r.projectId===projectId).map(r=>{
    const definition=definitions.get(r.metricId);
    if (!definition) throw new Error(`Missing metric definition for ${r.id}`);
    return {...r,label:definition.label,unit:definition.unit,category:definition.category};
  });
}
export function getCapabilityProjectEdges(data: PortfolioData): Array<{id:string;capabilityId:string;projectId:string;contributionIds:string[]}> {
  const edges=new Map<string,{id:string;capabilityId:string;projectId:string;contributionIds:string[]}>();
  for(const c of data.facts.contributions){
    if(c.ownership!=='DIRECT')continue;
    const id=`${c.capabilityId}::${c.projectId}`;
    const edge=edges.get(id)??{id,capabilityId:c.capabilityId,projectId:c.projectId,contributionIds:[]};
    edge.contributionIds.push(c.id);edges.set(id,edge);
  }
  return [...edges.values()];
}
export function getTechnologyProjectEdges(data: PortfolioData): Array<{id:string;technologyId:string;projectId:string;contributionIds:string[]}> {
  const byId=new Map(data.facts.contributions.map(c=>[c.id,c]));
  const edges=new Map<string,{id:string;technologyId:string;projectId:string;contributionIds:string[]}>();
  for(const b of data.bridges.contributionTechnology){
    const c=byId.get(b.contributionId);if(!c||c.ownership!=='DIRECT')continue;
    const id=`${b.technologyId}::${c.projectId}`;
    const edge=edges.get(id)??{id,technologyId:b.technologyId,projectId:c.projectId,contributionIds:[]};
    if(!edge.contributionIds.includes(c.id))edge.contributionIds.push(c.id);
    edges.set(id,edge);
  }
  return [...edges.values()];
}
