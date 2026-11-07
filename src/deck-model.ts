import { data } from './data';

export const deckSlides = data.presentation.slides;
export type DeckSlide = typeof deckSlides[number];
export const slideNumber = (index: number) => String(index + 1).padStart(2, '0');

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
