# Jaffery Center of Roanoke website

A six-page community website. Page content is generated from `build.py`; React/TypeScript provides the server-rendered, hydrated navigation without replacing the page markup. Original DeadlineOS files (`app.js`, `fx.js`, `orbitos-dev`) are preserved in the checkout and are not loaded by this site.

## Run and build

```sh
npm install
npm run dev         # Vite preview on port 5173
npm run typecheck
npm run build       # regenerates all six pages, then outputs dist/
npm test            # checks generated pages, links, active nav and assets
```

Edit page copy and links in `build.py`, then run `npm run build` (or `python3 build.py` after dependencies are installed). The generated HTML pages are also checked in for easy review. Shared styles are in `styles.css`; progressive-enhancement behavior is in `site.js`. The desktop glass navbar CSS is in `components/ui/liquid-glass-navbar.css` and is loaded as a stylesheet to avoid a CSS-text hydration mismatch. The mobile menu and desktop navbar share `src/navbar-config.tsx` and `src/site-navigation.tsx`; `src/render-nav.tsx` embeds the React markup in each page and `src/navbar-entry.tsx` hydrates it.

The project has React, TypeScript, Tailwind CSS, and a shadcn-compatible `components/ui` structure (`components.json` points `@/components/ui` to `/components/ui`). Tailwind preflight is disabled to preserve the existing site styling. The navbar now uses a single CSS glass capsule instead of the former shader/canvas + duplicate CSS indicator. The URL/SSR active link is authoritative; DOMRect measurements, ResizeObserver and font-loading events keep the decorative capsule aligned without an animation loop. Reduced-motion navigation switches instantly. The mobile experience is a labeled, keyboard-accessible glass menu in the sticky top header, not a bottom dock.

`components/ui/glsl-hills.tsx` adapts the supplied Three.js shader as a reusable decorative component; `components/ui/glsl-hills-demo.tsx` demonstrates it. `build.py` inserts a decorative mount behind the hero on **all six pages**, and `src/hills-entry.tsx` lazy-loads the effect on screens 768px and wider when motion is permitted. The component accepts `width`, `height`, `cameraZ`, `planeSize`, and `speed` props; the site uses the defaults except for a slower `speed={0.18}`. It requires no provider, state store, image asset, or icon. Its canvas is hidden from assistive technology and cannot intercept clicks. The site's existing gradient provides the mobile, reduced-motion, unsupported-WebGL, and no-JavaScript fallback. Rendering pauses when the hero is offscreen or the tab is hidden, and GPU resources are disposed on unmount. The shader is a lazy-loaded ~130 kB gzip chunk on desktop, not part of the initial mobile payload. Edit the mount in `build.py`, not generated page HTML.

## Proposed visual identity and glass materials

`assets/brand/mihrab-color.svg` is a proposed emerald mihrab with a small eight-pointed geometric star; `mihrab-mono.svg`, `mihrab-reverse.svg`, and `favicon.svg` cover other uses. The old brand star is preserved as `legacy-brand-symbol.svg` and the sprite symbol remains in `build.py` for restoration. Obtain organizational approval before adopting the new identity permanently. `styles.css` defines reusable crystal, frosted, emerald, and soft glass tokens/classes. No external fonts or stock-building photos were added; the hero artwork remains explicitly illustrative.

## Content and publishing notes

- Address: **3031 Preston Avenue, Roanoke, VA 24012**. Contact: **jafferycenter@gmail.com**. These, the WhatsApp request instructions, and Sunday School details were checked against the center's [official About & Contact](https://www.jafferycenter.org/about-contact) and [Sunday School](https://www.jafferycenter.org/sunday-school) pages. The website describes the community as serving **Roanoke**.
- The homepage event area is an honest **empty state**, not a fabricated scheduled event. Add confirmed dates, times, and speakers in `build.py` when available. No public phone number, regular visiting hours, prayer times, or event schedules have been invented.
- The PayPal button uses the destination from the center's [existing donate page](https://www.jafferycenter.org/donate); confirm it with the center before publishing. The site does not process payments.
- The contact form composes a `mailto:` draft and requires an email app. Nothing is sent or stored by the site. The address-copy control attempts the Clipboard API, then a legacy copy fallback. The hero artwork is illustrative, not a photograph of the building. Font licenses are in `assets/fonts/`.

## Verification performed

TypeScript typecheck and Vite production build pass. Headless Chromium checks covered all six pages at **320, 375, 390, 768, 1024, and 1440px** with no horizontal overflow or browser-console errors; the sticky header stayed at the top. After the hills integration, all six pages were retested at 390, 768, 1024, and 1440px: desktop/tablet WebGL canvases rendered, mobile fell back to CSS, reduced-motion had no canvas, and no horizontal overflow or browser-console errors were observed. Desktop and mobile navigation, keyboard Escape/focus behavior, browser back, filters, FAQ, address copying, form validation, payment/map link targets, and reduced motion were exercised. An automated WCAG A/AA axe scan on all six pages at mobile and desktop widths reported no violations. Manual approval of wording, upcoming events, and payment destination is still needed before publishing.

## Liquid glass 2.0 QA

The nav audit found competing WebGL/CSS indicators (the canvas appeared after hydration and could flash over the fallback), `offsetLeft` plus padding measurements that shifted the drop, a `sessionStorage` previous-selection replay that could survive refresh/back, and a second active-link background. The rewrite removes the shader and replay. A single capsule is positioned from the active link’s actual DOM bounds; the server-rendered active background remains visible only until JavaScript measures it. Clicking begins a glide without delaying native page navigation. The follow-up motion pass avoids the first-paint slide, batches scroll reads, pauses the decorative hero glow offscreen, defers terrain loading until idle, and adds cancellable filter transitions. Revealed content never becomes fully transparent, even if observation fails. We deliberately keep native page navigation rather than enabling cross-document view transitions that can wipe the page or duplicate the sticky header. All six pages were browser-tested at 320, 390, 768, 1024, and 1440px without overflow, console errors, or incorrect active links; 12 successive desktop link navigations, reload, back, scrolling, resizing, and mobile Escape/focus behavior passed. Full-page desktop/mobile captures are in `qa/`. Axe WCAG A/AA scans at 390 and 1440px reported zero violations on all six pages. Additional checks covered rapid repeated filtering, rapid address copying and label reset, reduced motion, and simulated WebGL context loss/restoration without browser errors. No real payment submission or actual recipient email delivery was performed; those remain external to this static website. The PR still needs a safe integration decision for the separate DeadlineOS `main` page.
