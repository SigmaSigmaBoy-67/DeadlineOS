import { GLSLHills } from '@/components/ui/glsl-hills'

/** Standalone preview of the site's decorative hero treatment. */
export default function GLSLHillsDemo() {
  return <div className="relative isolate h-[420px] w-full overflow-hidden bg-emerald-950 text-white">
    <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true"><GLSLHills /></div>
    <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-5xl">A place to belong.</h1>
      <p className="mt-4 max-w-lg">Faith, family, and community in Roanoke, Virginia.</p>
    </div>
  </div>
}
