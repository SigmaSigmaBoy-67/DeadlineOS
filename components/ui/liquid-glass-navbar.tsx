"use client";

/**
 * Nimbus UI · Liquid Navbar — "Waterline"
 * Adapted for the Jaffery Center site from the component supplied by the user.
 * Water uses a small WebGL shader; the active drop has a CSS fallback.
 * Original design credit: guglielmogiannattasio.it
 */
import * as React from "react";

export type NimbusFx =
  | "plane"
  | "drop"
  | "spin"
  | "glow"
  | "wave"
  | "pop"
  | "none";
export type LiquidNavItem = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  fx?: NimbusFx;
};
export type LiquidNavbarProps = {
  items?: LiquidNavItem[];
  defaultActive?: number;
  active?: number;
  onChange?: (index: number, item: LiquidNavItem) => void;
  tone?: "light" | "dark";
  compact?: boolean;
  sound?: boolean;
  /** Opt in to WebGL; the CSS water drop is the reliable default. */
  webgl?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

const I = (children: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);
export const NimbusIcons = {
  home: I(
    <>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M6 9.6V20h12V9.6" />
      <path className="nv-door" d="M10 20v-5h4v5Z" />
    </>,
  ),
  globe: I(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17" />
    </>,
  ),
  plane: I(<path d="M21 12.2 3.6 5.4l2.7 6.8-2.7 6.4L21 12.2Zm-14.7 0H13" />),
  drop: I(
    <path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" />,
  ),
  user: I(
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c1.2-3.4 4-5 7.2-5s6 1.6 7.2 5" />
    </>,
  ),
  book: I(
    <>
      <path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" />
      <path d="M12 6v14" />
    </>,
  ),
  heart: I(
    <path d="M20.8 5.8a5.2 5.2 0 0 0-7.3 0L12 7.3l-1.5-1.5a5.2 5.2 0 0 0-7.3 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.2Z" />,
  ),
  pin: I(
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>,
  ),
};
const DEFAULT_ITEMS: LiquidNavItem[] = [
  { label: "Home", icon: NimbusIcons.home, fx: "glow" },
  { label: "Explore", icon: NimbusIcons.globe, fx: "spin" },
  { label: "Flights", icon: NimbusIcons.plane, fx: "plane" },
  { label: "Weather", icon: NimbusIcons.drop, fx: "drop" },
  { label: "Profile", icon: NimbusIcons.user, fx: "wave" },
];
const PAD = 12;

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;uniform vec4 uBlob;uniform vec4 uRipple;uniform float uDark;
float capsule(vec2 p,vec2 c,float halfWidth,float radius){p-=c;p.x=max(abs(p.x)-halfWidth,0.);return length(p)-radius;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 vec2 size=uPill.zw; vec2 q=abs(p-(uPill.xy+size*.5))-size*.5+size.y*.5;
 float pill=length(max(q,0.))+min(max(q.x,q.y),0.)-size.y*.5;
 float d=capsule(p,uBlob.xy,uBlob.z,uBlob.w);
 float pulse=sin(length(p-uRipple.xy)*.19-uRipple.z*22.)*exp(-abs(length(p-uRipple.xy)-uRipple.z*135.)*.045)*uRipple.w;
 float edge=1.-smoothstep(-1.5,1.5,d+pulse*2.);
 float inside=1.-smoothstep(-1.,1.,pill);
 float rim=exp(-abs(d)*.38)*.22;
 float caustic=sin(p.x*.17+p.y*.11+uTime*1.8)*sin(p.x*.08-p.y*.16-uTime)*.045;
 vec3 col=mix(vec3(.33,.67,.53),vec3(.75,.96,.86),clamp((p.y-uBlob.y)/(-uBlob.w*2.)+.5,0.,1.));
 if(uDark>.5)col=mix(col,vec3(.7,.9,.86),.6);
 float alpha=inside*clamp(edge*(.54+caustic)+rim,0.,.85);
 gl_FragColor=vec4(col*alpha,alpha);
}`;

type GLState = {
  gl: WebGLRenderingContext;
  uniforms: Record<string, WebGLUniformLocation | null>;
};
function initGL(canvas: HTMLCanvasElement): GLState | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT),
    fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const attr = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const name of [
    "uRes",
    "uDpr",
    "uTime",
    "uPill",
    "uBlob",
    "uRipple",
    "uDark",
  ])
    uniforms[name] = gl.getUniformLocation(program, name);
  return { gl, uniforms };
}

export function LiquidNavbar({
  items = DEFAULT_ITEMS,
  defaultActive = 0,
  active,
  onChange,
  tone = "light",
  compact = false,
  sound = false,
  webgl = false,
  className,
  style,
}: LiquidNavbarProps) {
  const [inner, setInner] = React.useState(defaultActive);
  const current = Math.max(0, Math.min(items.length - 1, active ?? inner));
  const [glMode, setGlMode] = React.useState<"on" | "off">("off");
  const [fx, setFx] = React.useState({ index: -1, count: 0 });
  const navRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dropRef = React.useRef<HTMLSpanElement>(null);
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);
  const audioRef = React.useRef<AudioContext | null>(null);
  const wakeRef = React.useRef<() => void>(() => {});
  const state = React.useRef({
    x: 0,
    velocity: 0,
    target: 0,
    half: 20,
    radius: 21,
    y: 0,
    width: 0,
    height: 0,
    rippleX: 0,
    rippleY: 0,
    rippleAge: 10,
    visible: true,
    reduced: false,
    raf: 0,
    last: 0,
    gl: null as GLState | null,
  });

  const measure = React.useCallback(() => {
    const nav = navRef.current,
      el = itemRefs.current[current];
    if (!nav || !el) return;
    const s = state.current;
    s.width = nav.offsetWidth;
    s.height = nav.offsetHeight;
    s.target = PAD + el.offsetLeft + el.offsetWidth / 2;
    s.y = PAD + el.offsetTop + el.offsetHeight / 2;
    s.half = Math.max(0, (el.offsetWidth - el.offsetHeight) / 2);
    s.radius = el.offsetHeight / 2;
    if (!s.x) s.x = s.target;
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round((s.width + PAD * 2) * dpr),
        h = Math.round((s.height + PAD * 2) * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${s.width + PAD * 2}px`;
        canvas.style.height = `${s.height + PAD * 2}px`;
      }
    }
  }, [current]);

  React.useLayoutEffect(() => {
    measure();
    // Native page navigation stays instant. Only the indicator animates from
    // the previously selected item after the next page has already loaded.
    try {
      const stored = sessionStorage.getItem("liquid-nav-from");
      sessionStorage.removeItem("liquid-nav-from");
      const from = stored === null ? -1 : Number(stored);
      const previous = itemRefs.current[from];
      if (
        Number.isInteger(from) &&
        from >= 0 &&
        from !== current &&
        previous &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        state.current.x = PAD + previous.offsetLeft + previous.offsetWidth / 2;
        state.current.velocity = 0;
        state.current.rippleAge = 0;
      }
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
  }, [measure, compact, items.length, current]);
  React.useEffect(() => {
    const s = state.current,
      canvas = canvasRef.current;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    s.reduced = motionQuery.matches;
    s.visible =
      !!navRef.current?.getBoundingClientRect().width &&
      document.visibilityState === "visible";
    s.gl = webgl && !s.reduced && s.visible && canvas ? initGL(canvas) : null;
    setGlMode(s.gl ? "on" : "off");
    const lost = (event: Event) => {
      event.preventDefault();
      s.gl = null;
      setGlMode("off");
    };
    canvas?.addEventListener("webglcontextlost", lost);

    const frame = (time: number) => {
      s.raf = 0;
      if (!s.visible) return;
      const dt = Math.min((time - (s.last || time)) / 1000, 0.035);
      s.last = time;
      if (s.reduced) {
        s.x = s.target;
        s.velocity = 0;
      } else {
        s.velocity += (s.target - s.x) * 190 * dt;
        s.velocity *= Math.exp(-20 * dt);
        s.x += s.velocity * dt;
      }
      s.rippleAge += dt;
      if (dropRef.current) {
        dropRef.current.style.width = `${s.half * 2 + s.radius * 2}px`;
        dropRef.current.style.transform = `translateX(${s.x - s.half - s.radius - PAD}px) scaleX(${1 + Math.min(Math.abs(s.velocity) / 1600, 0.16)})`;
      }
      if (s.gl) {
        const { gl, uniforms: u } = s.gl;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform2f(u.uRes, s.width + PAD * 2, s.height + PAD * 2);
        gl.uniform1f(u.uDpr, dpr);
        gl.uniform1f(u.uTime, time / 1000);
        gl.uniform4f(u.uPill, PAD, PAD, s.width, s.height);
        gl.uniform4f(u.uBlob, s.x, s.y, s.half, s.radius);
        gl.uniform4f(
          u.uRipple,
          s.rippleX,
          s.rippleY,
          s.rippleAge,
          Math.max(0, 1 - s.rippleAge),
        );
        gl.uniform1f(u.uDark, tone === "dark" ? 1 : 0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      // Static glass needs no continuous animation. Stop once the spring and
      // ripple settle; restart only after interaction, resize, or visibility.
      const moving =
        Math.abs(s.target - s.x) > 0.25 || Math.abs(s.velocity) > 2;
      if (!s.reduced && (moving || s.rippleAge < 1.1))
        s.raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (s.visible && !s.raf) {
        s.last = performance.now();
        s.raf = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;
    const maybeInit = () => {
      measure();
      if (
        webgl &&
        !s.reduced &&
        s.visible &&
        !s.gl &&
        canvas &&
        navRef.current?.offsetWidth
      ) {
        s.gl = initGL(canvas);
        setGlMode(s.gl ? "on" : "off");
      }
      wake();
    };
    const resize =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(maybeInit)
        : null;
    if (resize && navRef.current) resize.observe(navRef.current);
    else window.addEventListener("resize", maybeInit);
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            s.visible =
              entry.isIntersecting && document.visibilityState === "visible";
            if (s.visible) maybeInit();
            else {
              cancelAnimationFrame(s.raf);
              s.raf = 0;
            }
          })
        : null;
    if (observer && navRef.current) observer.observe(navRef.current);
    const visibility = () => {
      s.visible =
        document.visibilityState === "visible" && !!navRef.current?.offsetWidth;
      if (s.visible) maybeInit();
      else {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
      }
    };
    const restored = () => {
      s.gl = null;
      maybeInit();
    };
    const motionChanged = () => {
      s.reduced = motionQuery.matches;
      if (s.reduced) {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
        s.gl = null;
        setGlMode("off");
        wake();
      } else maybeInit();
    };
    document.addEventListener("visibilitychange", visibility);
    canvas?.addEventListener("webglcontextrestored", restored);
    motionQuery.addEventListener("change", motionChanged);
    wake();
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      observer?.disconnect();
      resize?.disconnect();
      if (!resize) window.removeEventListener("resize", maybeInit);
      canvas?.removeEventListener("webglcontextlost", lost);
      canvas?.removeEventListener("webglcontextrestored", restored);
      motionQuery.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", visibility);
      wakeRef.current = () => {};
      audioRef.current?.close().catch(() => {});
      audioRef.current = null;
    };
  }, [measure, tone, webgl]);

  const select = (index: number) => {
    const s = state.current;
    const el = itemRefs.current[index];
    if (el) {
      s.rippleX = PAD + el.offsetLeft + el.offsetWidth / 2;
      s.rippleY = s.y;
      s.rippleAge = 0;
    }
    setFx((prev) => ({ index, count: prev.count + 1 }));
    wakeRef.current();
    if (sound) {
      try {
        const ctx = (audioRef.current ||= new AudioContext());
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain(),
          now = ctx.currentTime;
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.09);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.17);
      } catch {
        /* audio is optional */
      }
    }
    if (index !== current) {
      if (items[index]?.href) {
        try {
          sessionStorage.setItem("liquid-nav-from", String(current));
        } catch {
          /* Optional polish only. */
        }
      }
      if (active === undefined) setInner(index);
      onChange?.(index, items[index]);
    }
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next =
      (current + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
      items.length;
    select(next);
    itemRefs.current[next]?.focus();
  };

  return (
    <nav
      ref={navRef}
      className={["nimbus-nav", className].filter(Boolean).join(" ")}
      style={style}
      data-tone={tone}
      data-gl={glMode}
      data-compact={String(compact)}
      aria-label="Main navigation"
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        const rect = navRef.current?.getBoundingClientRect();
        if (rect) {
          state.current.rippleX = event.clientX - rect.left + PAD;
          state.current.rippleY = event.clientY - rect.top + PAD;
          state.current.rippleAge = 0;
          wakeRef.current();
        }
      }}
    >
      <span className="nimbus-glass" aria-hidden="true" />
      <canvas className="nimbus-water" ref={canvasRef} aria-hidden="true" />
      <span className="nimbus-drop" ref={dropRef} aria-hidden="true" />
      {items.map((item, index) => {
        const content = (
          <>
            {item.icon && (
              <span
                className="nv-ico"
                key={fx.index === index ? fx.count : 0}
                data-fx={
                  fx.index === index && item.fx !== "none"
                    ? (item.fx ?? "pop")
                    : undefined
                }
              >
                {item.icon}
              </span>
            )}
            <span className="nimbus-label">{item.label}</span>
          </>
        );
        const props = {
          className: "nimbus-item",
          "aria-current": index === current ? ("page" as const) : undefined,
          "aria-label": item.label,
          title: item.label,
          onClick: () => select(index),
          ref: (node: HTMLElement | null) => {
            itemRefs.current[index] = node;
          },
        };
        return item.href ? (
          <a key={`${item.label}-${index}`} {...props} href={item.href}>
            {content}
          </a>
        ) : (
          <button key={`${item.label}-${index}`} {...props} type="button">
            {content}
          </button>
        );
      })}
    </nav>
  );
}
export { LiquidNavbar as Component };
export default LiquidNavbar;
