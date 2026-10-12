/**
 * Data contract for portfolio-data.json. The JSON file is the authoritative content source.
 * Do not duplicate the same project/contribution copy in React components.
 */
export type Ownership = 'DIRECT' | 'JOINT' | 'TEAM';
export type EvidenceStatus = 'SOURCE_SUPPORTED' | 'USER_CONFIRMED' | 'REVIEW_REQUIRED';
export type WorkOrigin = 'HISTORICAL_PROJECT' | 'HISTORICAL_TEAM_EXPERIENCE' | 'RECONSTRUCTED_DESIGN';
export type MetricCategory = 'SCALE' | 'VALIDATION_CONTEXT' | 'CONFIGURATION' | 'STRUCTURE';
export type EvidenceKind = 'SOURCE' | 'DESIGN' | 'EXPERIENCE';
export type EvidenceVerificationStatus = EvidenceStatus | 'RECONSTRUCTED_DESIGN';

export interface Project {
  id: string; slug: string; name: string; nameEn: string;
  organization: string; periodStart: string; periodEnd: string;
  kind: string; teamSize: number | null; contributionPercent: number | null;
  role: string; summary: string; problemSummary: string; outcomeSummary: string;
  cardLabel: string; cardLabelKind: MetricCategory | 'IMPLEMENTATION' | 'DESIGN';
  featuredContributionIds: string[]; sortOrder: number; provenanceNote?: string;
}
export interface Capability { id: string; label: string; description: string; noConfirmedContribution?: boolean }
export interface Process { id: string; label: string; description: string }
export type TechnologyGroup = 'Java / Backend' | 'Python / Data' | 'SQL / Database' | 'Optimization' | 'Interface / Tools';
export interface Technology {
  id: string; label: string; category: string; description: string;
  group: TechnologyGroup; groupOrder: number; displayOrder: number;
  heroOrder?: number; featuredOrderByProject?: Record<string, number>;
}
export interface MetricDefinition {
  id: string; label: string; unit: string; category: MetricCategory;
  aggregationRule: 'DO_NOT_AGGREGATE'; description: string;
}
export interface Evidence {
  id: string; label: string; kind: EvidenceKind;
  verificationStatus: EvidenceVerificationStatus;
  projectId: string; description: string;
  url: string | null; publicAssetPath: string | null;
}
export interface Contribution {
  id: string; projectId: string; capabilityId: string; processId: string;
  title: string; problem: string; decision: string; action: string; output: string;
  verification: string | null; sectionAnchor: string;
  ownership: Ownership; evidenceStatus: EvidenceStatus;
  origin: WorkOrigin; note: string | null;
}
export interface MetricRecord {
  id: string; projectId: string; metricId: string; numericValue: number;
  context: string; qualifier: string; evidenceStatus: EvidenceStatus;
}
export interface LogicalTable {
  name: string; category: 'DIMENSION' | 'FACT' | 'BRIDGE'; grain: string;
  pk: string[]; fks: Array<{ column: string; references: string }>;
  columns: string[];
}
export interface Diagram {
  id: string; projectId: string; sectionAnchor: string; title: string;
  type: string; sourceClassification: string; disclosure: string;
  description: string;
  stages?: string[]; stateLabels?: string[];
  facts?: Record<string,string>;
  states?: Array<Record<string, string | number>>;
  entities?: string[]; relationships?: string[][];
}
export interface ProjectPage { sections: Array<{ id: string; title: string; body: string }>; sectionNavigation: string }
export interface PortfolioData {
  meta: {
    version: string; lastUpdated: string; locale: string;
    portfolioTitle: string; purpose: string;
    contentLock: 'LOCKED'; notProductionData: boolean;
    designReferences: Array<{name:string;url:string;adopt:string}>;
  };
  profile: {
    nameKo:string; nameEn:string; role:string; eyebrow:string; headline:string; intro:string;
    shortKeywords:string[];
    education:Array<{institution:string;major:string;degree:string}>;
    training:Array<{institution:string;track:string;display:string}>;
    certifications:string[];
    contact:{phone:string|null;email:string|null;resumeUrl:string|null;githubUrl:string|null;otherUrls:string[]};
    contactPlaceholderPolicy:string;
  };
  dimensions: {
    projects:Project[]; capabilities:Capability[]; processes:Process[];
    technologies:Technology[]; metrics:MetricDefinition[]; evidence:Evidence[];
  };
  facts: { contributions:Contribution[]; metricRecords:MetricRecord[] };
  bridges: {
    contributionTechnology:Array<{contributionId:string;technologyId:string}>;
    contributionEvidence:Array<{contributionId:string;evidenceId:string}>;
    metricEvidence:Array<{metricRecordId:string;evidenceId:string}>;
  };
  pages:Record<string,ProjectPage>;
  diagrams:Diagram[];
  logicalSchema:LogicalTable[];
  constraints: { showOnlyPersonallyPerformedWork:boolean; neverInventPerformanceFigures:boolean;
    neverInventCodeOrLinks:boolean; metricNumericOnly:boolean;
    noImplicitValidationOfReconstructedDiagrams:boolean;
    inactiveCapability:string; relationshipDerivation:string;
    projectSpecific:Record<string,string>;
  };
}
