import raw from '../portfolio_codex_bundle/portfolio-data.json';
import type { PortfolioData } from '../portfolio_codex_bundle/portfolio-types';

// The bundled JSON remains the only source for portfolio facts and copy.
export const data = raw as PortfolioData;
export type { PortfolioData, Project, Contribution, Diagram, LogicalTable, Technology, TechnologyGroup } from '../portfolio_codex_bundle/portfolio-types';
export * from '../portfolio_codex_bundle/portfolio-selectors';

export const projectPath = (slug: string) => `/projects/${slug}`;
export const sectionPath = (slug: string, section: string) => `${projectPath(slug)}?section=${encodeURIComponent(section)}`;

export const categoryLabel: Record<string, string> = {
  SCALE: '규모', CONFIGURATION: '설정', VALIDATION_CONTEXT: '평가 사례', STRUCTURE: '구조',
  IMPLEMENTATION: '구현 구조', DESIGN: '설계',
};

// Keep the source facts intact while presenting results in reader-facing language.
const visitorCopy = new Map<string, string>([
  ['소규모 2개 문제에서 목적함수 값 일치를 확인하고, 대규모 2개 문제에서 시간창 위반 없는 경로를 확인했습니다.', '소규모 문제에서 Xpress와 ALNS의 목적함수 값이 일치했고, 대규모 경로에서는 시간창 위반이 없었습니다.'],
  ['소규모 목적함수 비교, 대규모 시간창 준수 여부를 직접 확인했습니다.', '소규모 목적함수 비교와 대규모 경로의 시간창 제약 평가를 진행했습니다.'],
  ['소규모 2문제의 목적함수 값을 직접 비교하고 대규모 2문제에서 시간창 준수 여부를 직접 확인했습니다.', '소규모 문제의 목적함수를 Xpress 결과와 비교하고, 대규모 경로의 시간창 제약을 평가했습니다.'],
  ['두 방식의 비교 결과와 대규모 경로의 시간창 충족 여부를 확인했습니다.', '소규모 문제에서 목적함수 값이 일치했고, 대규모 경로에서 시간창 위반이 없었습니다.'],
  ['도착 시간창 준수 여부를 직접 확인한 대규모 문제', '도착 시간창 제약을 평가한 대규모 문제'],
  ['점포 데이터 행 수. 고유 점포 개수라는 의미 아님', '점포 데이터 행 수'],
]);

export const displayCopy = (value: string) => visitorCopy.get(value) ?? value;

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
