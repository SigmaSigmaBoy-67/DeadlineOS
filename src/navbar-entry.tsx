import { hydrateRoot } from 'react-dom/client'
import { SiteNavigation } from './site-navigation'
import { items } from './navbar-config'
import './tailwind.css'

const mount = document.getElementById('liquid-nav-root')
if (mount) {
  const path = window.location.pathname.split('/').pop() || 'index.html'
  const activeIndex = Math.max(0, items.findIndex(item => item.href === path))
  hydrateRoot(mount, <SiteNavigation activeIndex={activeIndex}/> )
}
