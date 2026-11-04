(() => {
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.home-hero, .page-hero');
  const header = document.querySelector('.site-header');

  // Coalesce scroll/layout reads to one per frame; also refresh on resize and bfcache restore.
  if (header) {
    let frame = 0;
    const syncHeader = () => {
      frame = 0;
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      header.classList.toggle('on-dark', !!hero && hero.getBoundingClientRect().bottom > header.offsetHeight / 2);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(syncHeader); };
    syncHeader();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
  }

  // CSS glow runs only while its hero is visible. No observer in older browsers.
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      hero.classList.toggle('is-paused', !entry.isIntersecting);
    }).observe(hero);
  }

  // Page links use native navigation. Keep below-fold content visible even if an
  // observer never fires (full-page captures, print, unsupported browsers).
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => {
      if (/\bdelay-\d\b/.test(el.className)) return;
      const siblings = [...el.parentElement.children].filter(child => child.classList.contains('reveal'));
      el.style.setProperty('--i', String(Math.min(siblings.indexOf(el), 5)));
    });
    elements.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * .95) el.classList.add('in-view', 'no-anim');
    });
    document.documentElement.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .05, rootMargin: '0px 0px -20px 0px' });
    elements.forEach(el => { if (!el.classList.contains('in-view')) observer.observe(el); });
  }

  // Animate only visible program tiles. Cancel our own in-flight FLIP animations
  // before a rapid re-filter so hidden tiles cannot linger in old positions.
  const filters = document.querySelectorAll('[data-filter]');
  const tiles = [...document.querySelectorAll('[data-category]')];
  const tileAnimations = new WeakMap();
  filters.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    tiles.forEach(tile => {
      tileAnimations.get(tile)?.cancel();
      tileAnimations.delete(tile);
    });
    const animate = !reducedMotion && typeof Element.prototype.animate === 'function';
    const before = animate ? new Map(tiles.filter(tile => !tile.hidden).map(tile => [tile, tile.getBoundingClientRect()])) : null;
    tiles.forEach(tile => { tile.hidden = selected !== 'all' && tile.dataset.category !== selected; });
    if (!animate) return;
    tiles.forEach(tile => {
      if (tile.hidden) return;
      const first = before.get(tile);
      const last = tile.getBoundingClientRect();
      let frames;
      if (!first) frames = [{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }];
      else if (first.left !== last.left || first.top !== last.top)
        frames = [{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'none' }];
      if (frames) tileAnimations.set(tile, tile.animate(frames, { duration: 300, easing: 'cubic-bezier(.22,.9,.25,1)' }));
    });
  }));

  const copyButton = document.querySelector('[data-copy-address]');
  if (copyButton) {
    const originalLabel = copyButton.textContent;
    let resetTimer = 0;
    let latestClick = 0;
    copyButton.addEventListener('click', async () => {
      const click = ++latestClick;
      const address = '3031 Preston Avenue, Roanoke, VA 24012';
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(address);
          copied = true;
        }
      } catch { /* Try the legacy copy method below. */ }
      if (!copied) {
        const input = document.createElement('textarea');
        input.value = address;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        try { copied = document.execCommand('copy'); } catch { /* The address remains visible for manual selection. */ }
        input.remove();
      }
      if (click !== latestClick) return;
      copyButton.textContent = copied ? 'Address copied!' : 'Select the address above to copy';
      copyButton.classList.toggle('is-copied', copied);
      if (!reducedMotion && copyButton.animate) {
        copyButton.animate([{ opacity: .7, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
      }
      const status = document.getElementById('copy-status');
      if (status) status.textContent = copied ? 'Address copied to clipboard.' : 'Copy unavailable. Select the address above.';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyButton.textContent = originalLabel;
        copyButton.classList.remove('is-copied');
      }, 3000);
    });
  }

  const contactForm = document.querySelector('#contact-form');
  if (contactForm) contactForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const data = new FormData(contactForm);
    const topic = String(data.get('topic'));
    const name = String(data.get('name')).trim();
    const message = String(data.get('message')).trim();
    const subject = encodeURIComponent(`${topic} — Jaffery Center website`);
    const body = encodeURIComponent(`Hello Jaffery Center,\n\n${message}\n\nFrom,\n${name}`);
    const status = document.getElementById('form-status');
    if (status) status.textContent = 'Opening an email draft. Please review and send it in your email app; nothing has been sent yet.';
    // Do not disable the button: a visitor with no mail handler must be able to retry.
    const submit = contactForm.querySelector('button[type="submit"]');
    if (submit && !reducedMotion) {
      submit.animate([{ transform: 'scale(.98)' }, { transform: 'none' }], { duration: 200 });
    }
    window.location.href = `mailto:jafferycenter@gmail.com?subject=${subject}&body=${body}`;
  });
})();
