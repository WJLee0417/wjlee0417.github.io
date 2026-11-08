import { data } from './data';
import { deckSlides, resolvePanel } from './deck-model';

// Preserve previously shared slide links without exposing the presentation UI.
export function webDestination(search: string) {
  const slide = deckSlides.find(item => item.id === new URLSearchParams(search).get('slide'));
  if (!slide) return { pathname: '/', search: '', hash: '' };
  if (slide.type === 'contents') return { pathname: resolvePanel(slide, search) === 1 ? '/background' : '/projects', search: '', hash: '' };
  if (slide.type === 'closing') return { pathname: '/', search: '', hash: '#contact' };
  if (slide.type === 'cover') return { pathname: resolvePanel(slide, search) === 1 ? '/projects' : '/', search: '', hash: resolvePanel(slide, search) === 2 ? '#contact' : '' };
  const project = data.dimensions.projects.find(item => item.id === slide.projectId)!;
  const work = data.facts.contributions.find(item => item.id === (slide.contributionIds[resolvePanel(slide, search)] ?? slide.contributionIds[0]));
  const firstGroup = work && deckSlides.find(group => group.projectId === project.id && group.type === 'work' && group.contributionIds.some(id => data.facts.contributions.find(item => item.id === id)?.sectionAnchor === work.sectionAnchor));
  const section = work && firstGroup?.id !== slide.id ? slide.id : work?.sectionAnchor;
  return { pathname: `/projects/${project.slug}`, search: section ? `?section=${section}` : '', hash: '' };
}
