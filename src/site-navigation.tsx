import * as React from "react";
import { LiquidNavbar } from "@/components/ui/liquid-glass-navbar";
import { items } from "./navbar-config";

/** The desktop pill and the small-screen menu share the same source of links. */
export function SiteNavigation({ activeIndex }: { activeIndex: number }) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    // Move keyboard focus into the menu after it opens; restore it on Escape.
    const frame = requestAnimationFrame(() =>
      panelRef.current?.querySelector("a")?.focus(),
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const links = [...(panelRef.current?.querySelectorAll("a") ?? [])];
      if (!links.length) return;
      const first = links[0],
        last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 1020) {
        const focusWasInMenu = panelRef.current?.contains(document.activeElement);
        setOpen(false);
        if (focusWasInMenu) requestAnimationFrame(() =>
          rootRef.current?.querySelector<HTMLElement>('.nimbus-item[aria-current="page"]')?.focus(),
        );
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <div className="site-navigation" ref={rootRef}>
      <div className="desktop-navigation">
        <LiquidNavbar
          items={items}
          defaultActive={activeIndex}
          active={activeIndex}
          tone="light"
        />
      </div>
      <div className="mobile-navigation">
        <button
          ref={buttonRef}
          className="mobile-menu-button"
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="mobile-nav-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="mobile-menu-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Menu</span>
        </button>
        <nav
          ref={panelRef}
          id="mobile-nav-panel"
          className={`mobile-nav-panel${open ? " is-open" : ""}`}
          aria-label="Mobile navigation"
          aria-hidden={!open}
          inert={!open}
        >
          <span className="mobile-panel-caption">Explore the center</span>
          {items.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={index === activeIndex ? "page" : undefined}
              onClick={() => {
                setOpen(false);
                if (index === activeIndex) buttonRef.current?.focus();
              }}
            >
              <span className="mobile-link-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              <span className="mobile-link-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
