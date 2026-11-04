import { hydrateRoot } from 'react-dom/client'
import { SiteNavigation } from './site-navigation'
import { items } from './navbar-config'
import './tailwind.css'

const mount = document.getElementById('liquid-nav-root')
if (mount) {
  // URL is authoritative; use the SSR link only for extensionless/unknown routes.
  // Never hydrate against a stale rendered selection on a known page URL.
  const last = window.location.pathname.split('/').pop() || 'index.html'
  const rendered = mount.querySelector('.desktop-navigation [aria-current="page"]')?.getAttribute('href')
  const path = items.find(item => item.href === last)?.href
    ?? items.find(item => item.href === `${last}.html`)?.href
    ?? rendered ?? 'index.html'
  const activeIndex = Math.max(0, items.findIndex(item => item.href === path))
  hydrateRoot(mount, <SiteNavigation activeIndex={activeIndex}/> )
}
