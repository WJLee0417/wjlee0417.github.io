// Offline interaction for the standalone, server-rendered HTML deck.
(() => {
  const app = document.querySelector('.deck-app');
  const slots = [...document.querySelectorAll('.slide-slot')];
  const previews = [...document.querySelectorAll('.deck-sidebar nav > button')];
  const viewport = document.querySelector('.deck-viewport');
  const space = document.querySelector('.deck-stage-space');
  let active = 0;
  let wheelTime = 0;
  let touchStart = null;
  const name = document.documentElement.dataset.owner;
  function resize() {
    const scale = Math.max(.1, Math.min((viewport.clientWidth - 64) / 1440, (viewport.clientHeight - 32) / 810));
    space.style.setProperty('--slide-scale', scale);
    space.style.width = `${1440 * scale}px`;
    space.style.height = `${810 * scale}px`;
    document.querySelector('.deck-sidebar').toggleAttribute('inert', innerWidth <= 900 && !app.classList.contains('menu-open'));
  }
  function menu(open) {
    app.classList.toggle('menu-open', open);
    document.querySelector('.deck-sidebar').toggleAttribute('inert', innerWidth <= 900 && !open);
    document.querySelector('[data-deck-action="menu"]').setAttribute('aria-expanded', String(open));
  }
  function show(index, updateHash = true) {
    if (index < 0 || index >= slots.length) return;
    active = index;
    slots.forEach((slot, i) => { slot.hidden = i !== index; });
    previews.forEach((button, i) => {
      button.dataset.active = String(i === index);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.querySelector('[data-deck-action="prev"]').disabled = index === 0;
    document.querySelector('[data-deck-action="next"]').disabled = index === slots.length - 1;
    document.querySelector('.deck-page-number strong').textContent = String(index + 1).padStart(2, '0');
    const slide = slots[index].querySelector('.portfolio-slide');
    document.querySelector('.deck-chapter-name').textContent = slide.querySelector('.slide-rail').textContent;
    document.title = `${previews[index].querySelector('.thumb-title').textContent} · ${name}`;
    if (updateHash) location.hash = `/?slide=${slide.dataset.slideId}`;
    viewport.scrollTop = 0;
    previews[index].scrollIntoView({ block: 'nearest' });
    menu(false);
  }
  function fromHash() {
    const id = new URLSearchParams(location.hash.replace(/^#\/?/, '')).get('slide');
    const index = slots.findIndex(slot => slot.querySelector('.portfolio-slide').dataset.slideId === id);
    show(index < 0 ? 0 : index, false);
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (event.target.classList.contains('deck-menu-backdrop')) menu(false);
    if (!target) return;
    if (target.dataset.goSlide !== undefined) { show(Number(target.dataset.goSlide)); return; }
    if (target.dataset.stateIndex !== undefined) {
      const figure = target.closest('figure');
      figure.querySelectorAll('[data-state-index]').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
      figure.querySelector('.deck-state-output').innerHTML = figure.querySelector(`[data-state-content="${target.dataset.stateIndex}"]`).innerHTML;
      return;
    }
    switch (target.dataset.deckAction) {
      case 'prev': show(active - 1); break;
      case 'next': show(active + 1); break;
      case 'print': window.print(); break;
      case 'menu': menu(!app.classList.contains('menu-open')); break;
      case 'fullscreen': if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); break;
    }
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable]')) return;
    const keys = { ArrowLeft: active - 1, ArrowRight: active + 1, PageUp: active - 1, PageDown: active + 1, Home: 0, End: slots.length - 1 };
    if (keys[event.key] !== undefined) { event.preventDefault(); show(keys[event.key]); }
    if (event.key === 'Escape') menu(false);
  });
  viewport.addEventListener('wheel', event => {
    if (innerWidth <= 900 || event.ctrlKey || Math.abs(event.deltaY) < 12 || event.target.closest('a,button')) return;
    event.preventDefault();
    if (Date.now() - wheelTime < 650) return;
    wheelTime = Date.now(); show(active + (event.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  viewport.addEventListener('touchstart', event => { touchStart = event.touches[0]; }, { passive: true });
  viewport.addEventListener('touchend', event => {
    if (!touchStart) return;
    const end = event.changedTouches[0]; const dx = end.clientX - touchStart.clientX; const dy = end.clientY - touchStart.clientY;
    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.5) show(active + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  window.addEventListener('hashchange', fromHash);
  new ResizeObserver(resize).observe(viewport);
  fromHash(); resize();
})();
