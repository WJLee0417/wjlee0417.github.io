import raw from '../portfolio_codex_bundle/portfolio-data.json';
import type { PortfolioData } from '../portfolio_codex_bundle/portfolio-types';

// The bundled JSON remains the only source for portfolio facts and copy.
export const data = raw as PortfolioData;
export type { PortfolioData, Project, Contribution, Diagram, EvidenceVerificationStatus, LogicalTable, Technology, TechnologyGroup } from '../portfolio_codex_bundle/portfolio-types';
export * from '../portfolio_codex_bundle/portfolio-selectors';

export const projectPath = (slug: string) => `/projects/${slug}`;
export const sectionPath = (slug: string, section: string) => `${projectPath(slug)}?section=${encodeURIComponent(section)}`;

export const categoryLabel: Record<string, string> = {
  SCALE: '규모', CONFIGURATION: '설정', VALIDATION_CONTEXT: '평가 사례', STRUCTURE: '구조',
  IMPLEMENTATION: '구현 구조', DESIGN: '설계',
};

// Preserve the source wording, including sample sizes, units and limitations.
export const displayCopy = (value: string) => value;

// Display-only labels for the design work in P004; each points to existing work.
const designFocus = [
  { label: 'Data Modeling', contributionId: 'FC021' },
  { label: 'ERD', contributionId: 'FC025' },
  { label: 'Requirements Analysis', contributionId: 'FC025' },
  { label: 'Business Process Design', contributionId: 'FC020' },
];
export function getDesignFocusByProject(projectId: string): string[] {
  if (projectId !== 'P004') return [];
  return designFocus.filter(item => data.facts.contributions.some(c => c.id === item.contributionId && c.projectId === projectId)).map(item => item.label);
}

const optimizationAlgorithms = [
  { label: 'ALNS', contributionId: 'FC010' },
  { label: '2-opt', contributionId: 'FC011' },
];
export function getAlgorithmsByProject(projectId: string): string[] {
  if (projectId !== 'P002') return [];
  return optimizationAlgorithms.filter(item => data.facts.contributions.some(c => c.id === item.contributionId && c.projectId === projectId)).map(item => item.label);
}
