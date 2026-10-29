'use strict';
/* DeadlineOS — FX Styles: injects the enhanced motion/transitions CSS. */
(function () {
  const css = document.createElement('style');
  css.textContent = `
  /* Staggered entrance for list items */
  @keyframes dlosEnter { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .dlos-enter { animation: dlosEnter 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  /* Page tab switch transition */
  @keyframes dlosPage { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .dlos-page-enter { animation: dlosPage 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
  /* Card hover lift */
  #full-assignment-list > div, #home-queue-list > div { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s ease, box-shadow 0.25s ease; }
  #full-assignment-list > div:hover, #home-queue-list > div:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,229,255,0.08); }
  /* Breathing glow while timer runs */
  @keyframes dlosBreathe { 0%,100% { box-shadow: 0 0 18px rgba(168,85,247,0.35); } 50% { box-shadow: 0 0 34px rgba(168,85,247,0.65); } }
  body.timer-running #timer-control-btn { animation: dlosBreathe 2.4s ease-in-out infinite; }
  body.timer-running #timer-display { text-shadow: 0 0 22px rgba(168,85,247,0.5); }
  /* Sheen sweep on the Do This Next hero card */
  .hero-sheen { position: relative; }
  .hero-sheen::after { content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background: linear-gradient(115deg, transparent 40%, rgba(0,229,255,0.06) 50%, transparent 60%); transform: translateX(-120%); animation: dlosSheen 7s ease-in-out infinite; }
  @keyframes dlosSheen { 0%, 60% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
  /* Buttons: quick tactile pop */
  button { transition: transform 0.15s ease, opacity 0.2s ease, box-shadow 0.25s ease, background-color 0.25s ease, color 0.2s ease; }
  button:not(:disabled):active { transform: scale(0.96); }
  @media (prefers-reduced-motion: reduce) {
    .dlos-enter, .dlos-page-enter, body.timer-running #timer-control-btn { animation-duration: 0.01s; }
    .hero-sheen::after { animation: none; }
  }
  `;
  document.head.appendChild(css);
})();