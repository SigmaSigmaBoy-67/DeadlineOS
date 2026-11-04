import { LiquidNavbar, NimbusIcons } from '@/components/ui/liquid-glass-navbar'

/** Standalone example; the website mounts its own Roanoke links in src/navbar-entry.tsx. */
export default function Demo() {
  return <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, background: '#123b32' }}>
    <LiquidNavbar tone="light" items={[
      { label: 'Home', icon: NimbusIcons.home, fx: 'glow' },
      { label: 'Explore', icon: NimbusIcons.globe, fx: 'spin' },
      { label: 'Flights', icon: NimbusIcons.plane, fx: 'plane' },
      { label: 'Weather', icon: NimbusIcons.drop, fx: 'drop' },
      { label: 'Profile', icon: NimbusIcons.user, fx: 'wave' },
    ]}/>
    <span style={{ font: '500 12px system-ui', color: '#e9dbb7' }}>CSS glass capsule · keyboard accessible · no WebGL</span>
  </div>
}
