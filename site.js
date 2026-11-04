(() => {
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  const header = document.querySelector('.site-header');
  if (header) {
    const hero = document.querySelector('.home-hero, .page-hero');
    const syncHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      header.classList.toggle('on-dark', !!hero && hero.getBoundingClientRect().bottom > header.offsetHeight / 2);
    };
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  // Page links use normal browser navigation: no artificial delay or wipe.
  // Reveal only content below the first viewport, so nothing flashes on load.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * .95) el.classList.add('in-view');
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

  const filters = document.querySelectorAll('[data-filter]');
  const tiles = document.querySelectorAll('[data-category]');
  filters.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    tiles.forEach(tile => { tile.hidden = selected !== 'all' && tile.dataset.category !== selected; });
  }));

  const copyButton = document.querySelector('[data-copy-address]');
  if (copyButton) copyButton.addEventListener('click', async () => {
    const original = copyButton.textContent;
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
    copyButton.textContent = copied ? 'Address copied!' : 'Select the address above to copy';
    const status = document.getElementById('copy-status');
    if (status) status.textContent = copied ? 'Address copied to clipboard.' : 'Copy unavailable. Select the address above.';
    setTimeout(() => { copyButton.textContent = original; }, 3000);
  });

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
    window.location.href = `mailto:jafferycenter@gmail.com?subject=${subject}&body=${body}`;
  });
})();
