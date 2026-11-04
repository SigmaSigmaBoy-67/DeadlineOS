"use client";

/**
 * Nimbus UI · Liquid Navbar — "Waterline"
 * Adapted for the Jaffery Center site from the component supplied by the user.
 * A single measured CSS capsule replaces the former shader/drop pair.
 * Original supplied component design credit: guglielmogiannattasio.it
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
  /** Deprecated visual cue from the original demo; links remain visually stable. */
  fx?: NimbusFx;
};
export type LiquidNavbarProps = {
  items?: LiquidNavItem[];
  defaultActive?: number;
  active?: number;
  onChange?: (index: number, item: LiquidNavItem) => void;
  tone?: "light" | "dark";
  compact?: boolean;
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
  { label: "Home", icon: NimbusIcons.home },
  { label: "Explore", icon: NimbusIcons.globe },
  { label: "Profile", icon: NimbusIcons.user },
];

/** URL/controlled active index is authoritative. The capsule is purely decorative. */
export function LiquidNavbar({
  items = DEFAULT_ITEMS,
  defaultActive = 0,
  active,
  onChange,
  tone = "light",
  compact = false,
  className,
  style,
}: LiquidNavbarProps) {
  const [inner, setInner] = React.useState(defaultActive);
  const current = Math.max(0, Math.min(items.length - 1, active ?? inner));
  const navRef = React.useRef<HTMLElement>(null);
  const indicatorRef = React.useRef<HTMLSpanElement>(null);
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);
  const [ready, setReady] = React.useState(false);

  const measure = React.useCallback(() => {
    const nav = navRef.current;
    const item = itemRefs.current[current];
    const indicator = indicatorRef.current;
    if (!nav || !item || !indicator) return;
    // DOMRects are measured in the same coordinate space; offsetLeft would
    // silently break if an offset parent or font/layout changed.
    const box = nav.getBoundingClientRect();
    const target = item.getBoundingClientRect();
    if (!box.width || !target.width) return;
    const x = target.left - box.left;
    indicator.style.width = `${target.width}px`;
    indicator.style.height = `${target.height}px`;
    indicator.style.top = `${target.top - box.top}px`;
    indicator.style.transform = `translate3d(${x}px, 0, 0)`;
    setReady(true);
  }, [current]);

  React.useLayoutEffect(() => { measure(); }, [measure]);

  // First measurement must paint before enabling transitions, or the drop can
  // visibly slide from the left edge on load. No timer or hydration-state race.
  React.useEffect(() => {
    if (!ready) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (navRef.current) navRef.current.dataset.motion = "true";
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [ready]);

  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    observer?.observe(nav);
    itemRefs.current.forEach(item => { if (item) observer?.observe(item); });
    window.addEventListener("resize", schedule, { passive: true });
    document.fonts?.addEventListener?.("loadingdone", schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      document.fonts?.removeEventListener?.("loadingdone", schedule);
      cancelAnimationFrame(frame);
    };
  }, [items, measure]);

  return (
    <nav
      ref={navRef}
      className={["nimbus-nav", className].filter(Boolean).join(" ")}
      style={style}
      data-tone={tone}
      data-compact={String(compact)}
      data-ready={String(ready)}
      aria-label="Main navigation"
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const focused = itemRefs.current.findIndex(item => item === document.activeElement);
        const from = focused < 0 ? current : focused;
        const next = (from + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
        itemRefs.current[next]?.focus(); // Focus is not selection: links navigate on activation only.
      }}
    >
      <span className="nimbus-glass" aria-hidden="true" />
      <span className="nimbus-drop" ref={indicatorRef} aria-hidden="true" />
      {items.map((item, index) => {
        const content = <>
          {item.icon && <span className="nv-ico" aria-hidden="true">{item.icon}</span>}
          <span className="nimbus-label">{item.label}</span>
        </>;
        const props = {
          className: "nimbus-item",
          "aria-current": index === current ? ("page" as const) : undefined,
          onClick: () => {
            if (index !== current && items[index].href) {
              // Begin the glide immediately while the browser follows the link.
              // No artificial navigation delay or stale state on the next page.
              const nav = navRef.current?.getBoundingClientRect();
              const target = itemRefs.current[index]?.getBoundingClientRect();
              const indicator = indicatorRef.current;
              if (nav && target && indicator) {
                indicator.style.width = `${target.width}px`;
                indicator.style.transform = `translate3d(${target.left - nav.left}px, 0, 0)`;
              }
            }
            if (active === undefined) setInner(index);
            if (index !== current) onChange?.(index, items[index]);
          },
          ref: (node: HTMLElement | null) => { itemRefs.current[index] = node; },
        };
        return item.href ? <a key={item.href} {...props} href={item.href}>{content}</a>
          : <button key={item.label} {...props} type="button">{content}</button>;
      })}
    </nav>
  );
}
export { LiquidNavbar as Component };
export default LiquidNavbar;
