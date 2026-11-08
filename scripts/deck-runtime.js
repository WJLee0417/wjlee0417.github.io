// Offline interaction for the standalone, server-rendered HTML deck.
(() => {
  const app = document.querySelector('.deck-app');
  const slots = [...document.querySelectorAll('.slide-slot')];
  const previews = [...document.querySelectorAll('.deck-sidebar nav > button')];
  const viewport = document.querySelector('.deck-viewport');
  const space = document.querySelector('.deck-stage-space');
  let active = 0;
  let part = 0;
  let wheelTime = 0;
  let touchStart = null;
  const name = document.documentElement.dataset.owner;
  const compact = () => innerWidth <= 900;
  const count = (index = active) => Number(slots[index].querySelector('.portfolio-slide').dataset.panelCount);
  function paintPanels() {
    const slide = slots[active].querySelector('.portfolio-slide');
    slide.querySelectorAll('[data-slide-panel]').forEach(panel => {panel.dataset.panelActive = String(Number(panel.dataset.slidePanel) === part);});
    const label = slide.querySelector(`[data-slide-panel="${part}"]`)?.dataset.panelLabel ?? 'Contact';
    document.querySelector('.deck-part-number').textContent = `${part + 1} / ${count()}`;
    document.querySelector('.deck-panel-name').textContent = label;
    document.querySelector('[data-deck-action="prev"]').disabled = active === 0 && (!compact() || part === 0);
    document.querySelector('[data-deck-action="next"]').disabled = active === slots.length - 1 && (!compact() || part === count() - 1);
  }
  function resize() {
    const scale = Math.max(.1, Math.min((viewport.clientWidth - 64) / 1440, (viewport.clientHeight - 32) / 810));
    space.style.setProperty('--slide-scale', scale);
    space.style.width = `${1440 * scale}px`;
    space.style.height = `${810 * scale}px`;
    document.querySelector('.deck-sidebar').toggleAttribute('inert', innerWidth <= 900 && !app.classList.contains('menu-open'));
    document.querySelector('.deck-main').toggleAttribute('inert', compact() && app.classList.contains('menu-open'));
    paintPanels();
  }
  function menu(open) {
    const wasOpen = app.classList.contains('menu-open');
    app.classList.toggle('menu-open', open);
    document.querySelector('.deck-sidebar').toggleAttribute('inert', innerWidth <= 900 && !open);
    document.querySelector('.deck-main').toggleAttribute('inert', compact() && open);
    document.querySelector('.deck-menu-button').setAttribute('aria-expanded', String(open));
    if (compact() && open) previews[active].focus();
    else if (compact() && wasOpen) document.querySelector('.deck-menu-button').focus();
  }
  function show(index, updateHash = true, panel = 0) {
    if (index < 0 || index >= slots.length) return;
    active = index;
    part = Number.isInteger(panel) && panel >= 0 && panel < count(index) ? panel : 0;
    slots.forEach((slot, i) => { slot.hidden = i !== index; });
    previews.forEach((button, i) => {
      button.dataset.active = String(i === index);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    paintPanels();
    document.querySelector('.deck-page-number strong').textContent = String(index + 1).padStart(2, '0');
    const slide = slots[index].querySelector('.portfolio-slide');
    document.querySelector('.deck-chapter-name').textContent = slide.querySelector('.slide-rail').textContent;
    document.title = `${previews[index].querySelector('.thumb-title').textContent} · ${name}`;
    if (updateHash) location.hash = `/?slide=${slide.dataset.slideId}${part ? `&part=${part}` : ''}`;
    viewport.scrollTop = 0;
    slide.querySelector('.slide-body')?.scrollTo({top:0});
    slide.querySelector('.deck-cover-content')?.scrollTo({top:0});
    previews[index].scrollIntoView({ block: 'nearest' });
    menu(false);
  }
  function fromHash() {
    const params = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
    const id = params.get('slide');
    const index = slots.findIndex(slot => slot.querySelector('.portfolio-slide').dataset.slideId === id);
    show(index < 0 ? 0 : index, false, Number(params.get('part') ?? 0));
  }
  function step(direction) {
    const next = part + direction;
    if (compact() && next >= 0 && next < count()) {show(active, true, next);return;}
    const index = active + direction;
    if (index >= 0 && index < slots.length) show(index, true, compact() && direction < 0 ? count(index) - 1 : 0);
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
      case 'prev': step(-1); break;
      case 'next': step(1); break;
      case 'print': window.print(); break;
      case 'menu': menu(!app.classList.contains('menu-open')); break;
      case 'fullscreen': if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); break;
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {menu(false);return;}
    if (app.classList.contains('menu-open')) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable]')) return;
    if (['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(event.key)) {
      event.preventDefault();
      if(event.key === 'Home') show(0);
      else if(event.key === 'End') show(slots.length - 1);
      else step(event.key === 'ArrowRight' || event.key === 'PageDown' ? 1 : -1);
    }
  });
  viewport.addEventListener('wheel', event => {
    if (innerWidth <= 900 || event.ctrlKey || Math.abs(event.deltaY) < 12 || event.target.closest('a,button')) return;
    event.preventDefault();
    if (Date.now() - wheelTime < 650) return;
    wheelTime = Date.now(); step(event.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  viewport.addEventListener('touchstart', event => { touchStart = event.touches.length === 1 && !event.target.closest('a,button') ? event.touches[0] : null; }, { passive: true });
  viewport.addEventListener('touchcancel', () => {touchStart = null;}, {passive:true});
  viewport.addEventListener('touchend', event => {
    if (!touchStart) return;
    const end = event.changedTouches[0]; const dx = end.clientX - touchStart.clientX; const dy = end.clientY - touchStart.clientY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });
  window.addEventListener('hashchange', fromHash);
  new ResizeObserver(resize).observe(viewport);
  fromHash(); resize();
})();
