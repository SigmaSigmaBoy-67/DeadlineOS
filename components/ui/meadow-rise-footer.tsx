"use client"

import * as React from 'react'

export interface MeadowLink { label: string; href: string; external?: boolean }
export interface MeadowColumn { title: string; links: MeadowLink[] }
export interface MeadowPalette {
  sky: [string, string]
  haze: string
  glow: string
  ground: string
  ink: string
  sub: string
  pill: string
  pillInk: string
  text: string
  muted: string
  line: string
  hills: [string, string][]
}
export interface MeadowRiseFooterProps {
  name: string
  brandHref: string
  logo: React.ReactNode
  heading: string
  subheading: string
  cta: MeadowLink
  tagline: string
  invocation?: string
  copyright: string
  closingLine: string
  columns: MeadowColumn[]
  newsletter?: false // Explicitly unavailable: this site has no signup destination.
  palette: MeadowPalette
  seed?: number
  height?: string
  heroHeight?: string
  botanicals?: boolean
  scrollParallax?: boolean
  drift?: number
  interactive?: boolean
  fontFamily?: string
  serifFamily?: string
}

// A compact, deterministic version of the supplied six-ridge scene. No
// newsletter, placeholder links, fake social accounts, or animation loop.
const FOOTER_CSS = `
.mrf-root { position:relative; isolation:isolate; min-height:var(--mrf-height); overflow:hidden; display:flex; flex-direction:column; background:var(--mrf-ground); color:var(--mrf-text); font-family:var(--mrf-sans); }
.mrf-root *, .mrf-root *::before, .mrf-root *::after { box-sizing:border-box; }
.mrf-scene { position:absolute; inset:0 0 auto; height:var(--mrf-hero); pointer-events:none; z-index:0; }
.mrf-scene canvas { display:block; width:100%; height:100%; opacity:.6; transform:translateY(20px); transition:opacity .9s ease,transform 1.1s cubic-bezier(.22,.9,.25,1); }
.mrf-in .mrf-scene canvas { opacity:1; transform:none; }
.mrf-hero { position:relative; z-index:1; height:var(--mrf-hero); flex:none; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding:clamp(52px,9vw,112px) 22px 0; text-align:center; }
.mrf-h { margin:0; max-width:16ch; color:var(--mrf-ink); font:400 clamp(44px,6vw,88px)/.99 var(--mrf-serif); letter-spacing:-.025em; text-wrap:balance; }
.mrf-line { display:block; }
.mrf-accent { font-style:italic; color:var(--mrf-accent); }
.mrf-sub { margin:18px 0 0; max-width:45ch; color:var(--mrf-sub); font-size:clamp(14px,1.35vw,17px); line-height:1.55; }
.mrf-cta { display:inline-flex; align-items:center; justify-content:center; margin-top:22px; min-height:48px; padding:10px 23px; border:1px solid var(--mrf-edge); border-radius:99px; color:var(--mrf-pill-ink); background:var(--mrf-pill); box-shadow:inset 0 1px #ffffff22,0 10px 28px #0008; text-decoration:none; font-size:14px; font-weight:650; transition:transform .25s,background .25s; }
.mrf-cta:hover { transform:translateY(-2px); background:var(--mrf-pill-hover); }
.mrf-cta:focus-visible, .mrf-link:focus-visible, .mrf-logo:focus-visible { outline:3px solid #49c24a; outline-offset:4px; border-radius:4px; }
.mrf-body { position:relative; z-index:1; flex:1; display:flex; flex-direction:column; width:min(1160px,calc(100% - 48px)); margin:0 auto; padding:22px 0 28px; }
.mrf-grid { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:clamp(30px,7vw,100px); }
.mrf-logo { display:inline-flex; align-items:center; gap:13px; color:var(--mrf-text); font:400 24px/1 var(--mrf-serif); letter-spacing:.05em; text-transform:uppercase; text-decoration:none; }
.mrf-logo img { display:block; width:38px; height:38px; }
.mrf-tag { max-width:33ch; color:var(--mrf-muted); font-size:14px; line-height:1.65; margin:16px 0 0; }
.mrf-invocation { margin:17px 0 0; max-width:38ch; color:var(--mrf-text); font-family:'Noto Naskh Arabic','Amiri',serif; font-size:19px; line-height:1.8; }
.mrf-cols { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; }
.mrf-col h3 { margin:2px 0 18px; color:var(--mrf-text); font:650 11px/1.4 var(--mrf-sans); text-transform:uppercase; letter-spacing:.2em; }
.mrf-col ul { list-style:none; padding:0; margin:0; display:grid; gap:13px; }
.mrf-link { color:var(--mrf-muted); font-size:14px; line-height:1.5; text-decoration:none; overflow-wrap:anywhere; transition:color .2s; }
.mrf-link:hover { color:var(--mrf-accent); }
.mrf-bottom { margin-top:auto; padding-top:25px; display:flex; align-items:center; justify-content:space-between; gap:14px 32px; border-top:1px solid var(--mrf-line); color:var(--mrf-muted); font-size:12px; }
.mrf-bottom p { margin:0; }
@media(max-width:767px) { .mrf-hero { padding:44px 20px 0; } .mrf-h { font-size:clamp(37px,10vw,60px); } .mrf-body { width:min(100% - 36px,560px); padding-top:8px; } .mrf-grid { grid-template-columns:1fr; gap:30px; } .mrf-cols { gap:20px; } .mrf-bottom { margin-top:32px; align-items:flex-start; flex-direction:column; } }
@media(max-width:350px) { .mrf-cols { grid-template-columns:1fr; } }
@media(prefers-reduced-motion:reduce) { .mrf-root *, .mrf-root *::before, .mrf-root *::after { animation:none !important; transition:none !important; } }
`

function parseHeading(src: string) {
  return src.split('\n').map(line => line.split('*').map((segment, index) => ({ segment, accent: index % 2 === 1 })))
}

export default function MeadowRiseFooter({
  name, brandHref, logo, heading, subheading, cta, tagline, invocation,
  copyright, closingLine, columns, palette, seed = 3, height = '720px',
  heroHeight = 'clamp(320px, 46svh, 460px)', botanicals = true,
  scrollParallax = true, drift = 0, interactive = false,
  fontFamily = '"Inter Tight", Arial, sans-serif',
  serifFamily = '"Instrument Serif", Georgia, serif',
}: MeadowRiseFooterProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const sceneRef = React.useRef<HTMLDivElement>(null)
  const [inView, setInView] = React.useState(false)
  const lines = React.useMemo(() => parseHeading(heading), [heading])

  React.useEffect(() => {
    const scene = sceneRef.current
    const canvas = canvasRef.current
    if (!scene || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) { setInView(true); return }
    const draw = () => {
      const w = Math.max(1, scene.clientWidth), h = Math.max(1, scene.clientHeight)
      const mobile = matchMedia('(max-width:767px)').matches
      const scale = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5)
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      const sky = ctx.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, palette.sky[0]); sky.addColorStop(1, palette.sky[1])
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
      const rng = (i: number) => {
        const x = Math.sin((seed * 97 + i * 71) * 12.9898) * 43758.5453
        return x - Math.floor(x)
      }
      palette.hills.forEach(([lit, shadow], index) => {
        const depth = index / Math.max(1, palette.hills.length - 1)
        const y = h * (.75 + depth * .25)
        const amplitude = h * (.075 + depth * .025)
        const gradient = ctx.createLinearGradient(0, y - amplitude, 0, h)
        gradient.addColorStop(0, lit); gradient.addColorStop(1, shadow)
        ctx.beginPath(); ctx.moveTo(-3, h)
        for (let x = -3; x <= w + 3; x += 5) {
          const u = x / Math.max(w, 1)
          const crest = y - amplitude * (Math.sin(u * 7 + rng(index) * 5) * .42 + Math.sin(u * 16 + index * 3.2) * .16 + .45)
          ctx.lineTo(x, crest)
        }
        ctx.lineTo(w + 3, h); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill()
      })
      // A dark fade ensures the painted hills join the footer ground cleanly.
      const fade = ctx.createLinearGradient(0, h * .72, 0, h)
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, palette.ground)
      ctx.fillStyle = fade; ctx.fillRect(0, h * .72, w, h * .28)
    }
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
    resize?.observe(scene)
    if (!resize) window.addEventListener('resize', draw)
    draw()
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer?.disconnect() } }, { rootMargin: '100px' })
      : null
    if (observer) observer.observe(scene)
    else setInView(true)
    // The scene must not leave its text hidden if painting or observation is slow.
    const fallback = window.setTimeout(() => setInView(true), 3500)
    return () => { resize?.disconnect(); observer?.disconnect(); if (!resize) window.removeEventListener('resize', draw); clearTimeout(fallback) }
  }, [palette, seed, botanicals, scrollParallax, drift, interactive])

  return <footer className={`mrf-root${inView ? ' mrf-in' : ''}`} style={{
    '--mrf-height': height, '--mrf-hero': heroHeight, '--mrf-ground': palette.ground,
    '--mrf-ink': palette.ink, '--mrf-sub': palette.sub, '--mrf-pill': palette.pill,
    '--mrf-pill-ink': palette.pillInk, '--mrf-pill-hover': '#236f2b',
    '--mrf-accent': '#8cdb87', '--mrf-edge': '#49c24a', '--mrf-text': palette.text,
    '--mrf-muted': palette.muted, '--mrf-line': palette.line,
    '--mrf-sans': fontFamily, '--mrf-serif': serifFamily,
  } as React.CSSProperties}>
    <style>{FOOTER_CSS}</style>
    <div className="mrf-scene" ref={sceneRef} aria-hidden="true"><canvas ref={canvasRef}/></div>
    <div className="mrf-hero"><h2 className="mrf-h">{lines.map((segments, i) => <span className="mrf-line" key={i}>{segments.map((part, k) => <React.Fragment key={k}>{part.accent ? <em className="mrf-accent">{part.segment}</em> : part.segment}</React.Fragment>)}</span>)}</h2>
      {subheading && <p className="mrf-sub">{subheading}</p>}
      <a className="mrf-cta" href={cta.href}>{cta.label} &nbsp; ↗</a>
    </div>
    <div className="mrf-body"><div className="mrf-grid"><div className="mrf-brand"><a className="mrf-logo" href={brandHref}>{logo}<span>{name}</span></a>
      <p className="mrf-tag">{tagline}</p>{invocation && <p className="mrf-invocation" lang="ar" dir="rtl">{invocation}</p>}
    </div><nav className="mrf-cols" aria-label="Footer">{columns.map(column => <div className="mrf-col" key={column.title}><h3>{column.title}</h3><ul>{column.links.map(link => <li key={link.href + link.label}><a className="mrf-link" href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined}>{link.label}</a></li>)}</ul></div>)}</nav></div>
      <div className="mrf-bottom"><p>{copyright}</p><p>{closingLine}</p></div>
    </div>
  </footer>
}
