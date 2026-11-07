(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tour = document.querySelector('.tour');
  const chs = [...document.querySelectorAll('.ch')];
  const end = document.getElementById('iletisim');
  const bar = document.querySelector('.bar');
  const endBody = end.querySelector('.end-body');
  const N = chs.length;

  // The 3D phone reads this: one chapter per card, plus where the phone stands and what its screen shows.
  const state = window.batu || (window.batu = {});
  Object.assign(state, {
    chapters: chs.map((c) => ({ screen: c.dataset.screen, side: +c.dataset.side || 1 })),
    endScreen: end.dataset.screen, i: 0, f: 0, turn: 0, dwell: 0, end: 0, mx: 0, my: 0,
  });

  if (window.Lenis && !reduced.matches) {
    const lenis = new Lenis({ lerp: 0.085 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#top') { e.preventDefault(); lenis.scrollTo(0); return; }
      const i = chs.findIndex((c) => '#' + c.id === id);
      if (i > -1) { e.preventDefault(); lenis.scrollTo(tour.offsetTop + (i / (N - 0.25)) * (tour.offsetHeight - innerHeight) + 2); return; }
      const el = document.querySelector(id);
      if (el) { e.preventDefault(); lenis.scrollTo(el); }
    }));
  }

  const smooth = (t) => t * t * (3 - 2 * t);
  let shown = -2;
  function measure() {
    const y = scrollY, vh = innerHeight;
    const p = Math.min(1, Math.max(0, (y - tour.offsetTop) / (tour.offsetHeight - vh)));
    const s = p * (N - 0.25), i = Math.min(N - 1, Math.floor(s)), f = s - i;
    state.i = i; state.f = f;
    state.dwell = Math.min(1, f / 0.72);
    state.turn = i < N - 1 ? smooth(Math.min(1, Math.max(0, (f - 0.72) / 0.28))) : 0;
    state.end = Math.min(1, Math.max(0, (y - (end.offsetTop - vh)) / (vh * 0.8)));
    // a card shows while its phone holds still and hides while the phone turns
    const active = i < N - 1 && f > 0.74 ? (f > 0.97 ? i + 1 : -1) : i;
    if (active !== shown) { shown = active; chs.forEach((c, k) => c.classList.toggle('on', k === active)); }
    // the free band above the card, where the phone has to fit on a tall screen
    state.bandTop = bar.getBoundingClientRect().bottom + 18;
    // measured from layout, so the cards' own rise and fade never moves the band
    const stageTop = chs[0].offsetParent.getBoundingClientRect().top;
    if (state.end > 0.04) state.bandBottom = end.getBoundingClientRect().top + endBody.offsetTop - 16;
    else {
      const card = chs[active > -1 ? active : i];
      // the phone's foot may tuck behind a card; the hero has no card, so it stops above the title
      state.bandBottom = stageTop + (card === chs[0] ? card.offsetTop + card.querySelector('h1').offsetTop - 8 : card.offsetTop + 44);
    }
    // the phone only needs to draw while the tour or the closing section is on screen
    const hidden = y > tour.offsetTop + tour.offsetHeight && y + vh < end.offsetTop;
    if (state.setRunning) state.setRunning(!hidden);
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; measure(); }); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('batu3d', measure);
  measure();

  if (!reduced.matches) addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    state.mx = e.clientX / innerWidth - 0.5; state.my = e.clientY / innerHeight - 0.5;
  });

  // Entrances for the sections after the tour.
  const seen = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      seen.unobserve(en.target);
      en.target.animate([{ opacity: 0, transform: 'translateY(32px)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards', delay: +(en.target.dataset.d || 0) });
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  if (!reduced.matches) document.querySelectorAll('main > section:not(.tour) > h2, .reel, .about-text, .qs details, .end-body').forEach((el) => {
    const sibs = [...el.parentElement.children];
    el.dataset.d = Math.min(5, sibs.indexOf(el)) * 80;
    seen.observe(el);
  });

  // Films play only while on screen.
  const films = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting && !reduced.matches) en.target.play().catch(() => {});
      else en.target.pause();
    }
  });
  document.querySelectorAll('video').forEach((v) => films.observe(v));
})();
