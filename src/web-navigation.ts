import { data } from './data';
import { deckSlides, resolvePanel } from './deck-model';

// Preserve previously shared slide links without exposing the presentation UI.
export function webDestination(search: string) {
  const slide = deckSlides.find(item => item.id === new URLSearchParams(search).get('slide'));
  if (!slide) return { pathname: '/', search: '', hash: '' };
  if (slide.type === 'contents') return { pathname: '/', search: '', hash: resolvePanel(slide, search) === 1 ? '#about' : '#projects' };
  if (slide.type === 'closing') return { pathname: '/', search: '', hash: '#contact' };
  if (slide.type === 'cover') return { pathname: '/', search: '', hash: ['', '#projects', '#contact'][resolvePanel(slide, search)] };
  const project = data.dimensions.projects.find(item => item.id === slide.projectId)!;
  const work = data.facts.contributions.find(item => item.id === (slide.contributionIds[resolvePanel(slide, search)] ?? slide.contributionIds[0]));
  return { pathname: `/projects/${project.slug}`, search: work ? `?section=${work.sectionAnchor}` : '', hash: '' };
}
