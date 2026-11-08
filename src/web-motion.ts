import { useEffect, useState, type RefObject } from 'react';

export function useWebMotion(root: RefObject<HTMLDivElement>, routeKey: string, home: boolean) {
  const [activeSection, setActiveSection] = useState('');
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
    let frame = 0;
    const update = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      shell.style.setProperty('--page-progress', String(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0));
      let current = '';
      if (home) for (const id of ['about','projects','contact']) {
        const box = document.getElementById(id)?.getBoundingClientRect();
        if (box && box.top <= window.innerHeight * .45 && box.bottom > 100) current = id;
      }
      setActiveSection(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const resize = new ResizeObserver(schedule); resize.observe(shell);
    return () => {
      observer?.disconnect();resize.disconnect();cancelAnimationFrame(frame);
      reduced.removeEventListener('change', setup);
      window.removeEventListener('scroll', schedule);window.removeEventListener('resize', schedule);
    };
  }, [root, routeKey, home]);
  return activeSection;
}
