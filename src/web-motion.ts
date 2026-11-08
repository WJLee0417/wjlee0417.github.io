import { useEffect, type RefObject } from 'react';

export function useWebMotion(root: RefObject<HTMLDivElement>, routeKey: string) {
  useEffect(() => {
    const shell = root.current;
    if (!shell) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targets = [...shell.querySelectorAll<HTMLElement>('[data-reveal]')];
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      if (reduced.matches || !('IntersectionObserver' in window)) {
        shell.dataset.motion = 'still';
        targets.forEach(target => { target.dataset.revealState = 'visible'; });
        return;
      }
      shell.dataset.motion = 'ready';
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.revealState = 'visible';
          observer?.unobserve(entry.target);
        }
      }, { threshold: .06, rootMargin: '0px 0px -24px 0px' });
      targets.forEach(target => { target.dataset.revealState = 'pending'; observer!.observe(target); });
    };
    setup();
    reduced.addEventListener('change', setup);
    return () => {
      observer?.disconnect();
      reduced.removeEventListener('change', setup);
    };
  }, [root, routeKey]);
}
