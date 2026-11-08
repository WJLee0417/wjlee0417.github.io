import { data } from './data';

export const deckSlides = data.presentation.slides;
export type DeckSlide = typeof deckSlides[number];
export const slideNumber = (index: number) => String(index + 1).padStart(2, '0');

// Compact screens page through the same content in readable, semantic sections.
export function slidePanels(slide: DeckSlide): string[] {
  if (slide.type === 'cover') return ['소개', '프로젝트', '연락처·사용 기술'];
  if (slide.type === 'contents') return ['프로젝트', '배경·사용 기술'];
  if (slide.type === 'overview') return ['프로젝트 개요', '구현 범위', ...(slide.diagramId ? ['구조·처리 흐름'] : [])];
  if (slide.type === 'work') return [
    ...slide.contributionIds.map(id => data.facts.contributions.find(work => work.id === id)!.title),
    ...(slide.diagramId ? ['구조·처리 사례'] : []),
  ];
  return ['Contact'];
}

export function resolvePanel(slide: DeckSlide, search: string): number {
  const params = new URLSearchParams(search);
  if (!params.has('part') && params.has('section') && slide.type === 'work') {
    const match = slide.contributionIds.findIndex(id => data.facts.contributions.find(work => work.id === id)?.sectionAnchor === params.get('section'));
    if (match >= 0) return match;
  }
  const index = Number(params.get('part') ?? 0);
  return Number.isInteger(index) && index >= 0 && index < slidePanels(slide).length ? index : 0;
}

/** Existing project/section URLs continue to land on the relevant slide. */
export function resolveSlide(pathname: string, search: string): number {
  const params = new URLSearchParams(search);
  const slug = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  if (slug) {
    const project = data.dimensions.projects.find(project => project.slug === slug);
    const section = params.get('section');
    if (project) {
      if (section && section !== 'overview') {
        const index = deckSlides.findIndex(slide => slide.projectId === project.id && (
          slide.contributionIds.some(id => data.facts.contributions.find(c => c.id === id)?.sectionAnchor === section)
        ));
        if (index >= 0) return index;
      }
      return deckSlides.findIndex(slide => slide.projectId === project.id);
    }
  }
  const index = deckSlides.findIndex(slide => slide.id === params.get('slide'));
  return index >= 0 ? index : 0;
}
