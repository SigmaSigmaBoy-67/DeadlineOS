import { createRoot } from 'react-dom/client'
import type { MeadowColumn, MeadowLink, MeadowPalette } from '@/components/ui/meadow-rise-footer'
import logoUrl from '@/assets/brand/jc-star.svg?url'

interface FooterConfig {
  heading: string
  subheading: string
  cta: MeadowLink
  tagline: string
  invocation: string
  explore: MeadowLink[]
  find: MeadowLink[]
}

const palette: MeadowPalette = {
  sky: ['#060907', '#0c120d'], haze: '#17291b', glow: '#214526',
  ground: '#060907', ink: '#e6e6e0', sub: '#c7d0c5',
  pill: '#1e6427', pillInk: '#e6e6e0', text: '#e6e6e0',
  muted: '#b6c3b4', line: 'rgba(73,194,74,0.3)',
  hills: [
    ['#1e4726', '#13331a'], ['#20522a', '#153820'],
    ['#21602c', '#173f22'], ['#1e5228', '#12391c'],
    ['#174520', '#0e2b16'], ['#10331a', '#060907'],
  ],
}

const mount = document.getElementById('footer-root')
if (mount) {
  let started = false
  const load = async () => {
    if (started) return
    started = true
    try {
      const config = JSON.parse(mount.dataset.config || '') as FooterConfig
      if (!config.heading || !config.cta?.href || !Array.isArray(config.explore) || !Array.isArray(config.find)) return
      const { default: MeadowRiseFooter } = await import('@/components/ui/meadow-rise-footer')
      const mobile = window.matchMedia('(max-width: 767px)').matches
      const columns: MeadowColumn[] = [
        { title: 'Explore', links: config.explore },
        { title: 'Find us', links: config.find },
      ]
      // createRoot replaces the static fallback only after the component loads.
      createRoot(mount).render(<MeadowRiseFooter
        name="Jaffery Center" brandHref="index.html"
        logo={<img src={logoUrl} alt="" width={38} height={38} />}
        heading={config.heading} subheading={config.subheading} cta={config.cta}
        tagline={config.tagline} invocation={config.invocation}
        newsletter={false}
        columns={columns} copyright={`© ${new Date().getFullYear()} Jaffery Center of Roanoke.`}
        closingLine="Made with care for our community." palette={palette}
        seed={3} height={mobile ? '640px' : '720px'}
        heroHeight={mobile ? '300px' : 'clamp(320px, 46svh, 460px)'}
        botanicals={!mobile} scrollParallax={!mobile} drift={0} interactive={false}
        fontFamily={'"Inter Tight", Arial, sans-serif'} serifFamily={'"Instrument Serif", Georgia, serif'}
      />)
    } catch {
      // Keep the complete, functional static footer if the island cannot load.
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); void load() }
    }, { rootMargin: '600px 0px' })
    observer.observe(mount)
  } else void load()
}
