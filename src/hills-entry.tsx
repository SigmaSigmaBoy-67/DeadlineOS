import { createRoot, type Root } from 'react-dom/client'

const mount = document.getElementById('hero-hills-root')
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
const desktop = window.matchMedia('(min-width: 768px)')

if (mount) {
  let root: Root | undefined
  let loading = false
  const update = async () => {
    if (motion.matches || !desktop.matches) {
      root?.unmount()
      root = undefined
      return
    }
    if (root || loading) return
    loading = true
    try {
      const { GLSLHills } = await import('@/components/ui/glsl-hills')
      if (!motion.matches && desktop.matches && !root) {
        root = createRoot(mount)
        root.render(<GLSLHills speed={0.18} />)
      }
    } catch {
      // The CSS hero background is the progressive-enhancement fallback.
    } finally {
      loading = false
    }
  }
  motion.addEventListener('change', update)
  desktop.addEventListener('change', update)
  void update()
}
