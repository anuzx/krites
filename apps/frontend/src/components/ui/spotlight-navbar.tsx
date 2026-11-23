"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { animate } from "framer-motion";

import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
}

export interface SpotlightNavbarProps {
  items?: NavItem[];
  className?: string;
  actions?: ReactNode;
  onItemClick?: (item: NavItem, index: number) => void;
  defaultActiveIndex?: number;
}

export function SpotlightNavbar({
  items = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Events", href: "#events" },
    { label: "Sponsors", href: "#sponsors" },
    { label: "Pricing", href: "#pricing" },
  ],
  className,
  actions,
  onItemClick,
  defaultActiveIndex = 0,
}: SpotlightNavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(true);

  // Refs for the "light" positions so we can animate them imperatively
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      // Direct update for immediate feedback (no spring for the mouse itself, feels snappier)
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHoverX(null);
      // When mouse leaves, spring the spotlight back to the active item
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (activeItem) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const targetX = itemRect.left - navRect.left + itemRect.width / 2;

        animate(spotlightX.current, targetX, {
          type: "spring",
          stiffness: 200,
          damping: 20,
          onUpdate: (v) => {
            spotlightX.current = v;
            nav.style.setProperty("--spotlight-x", `${v}px`);
          },
        });
      }
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  // Handle the "Ambience" (Active Item) Movement
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);

    if (activeItem) {
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;

      animate(ambienceX.current, targetX, {
        type: "spring",
        stiffness: 200,
        damping: 20,
        onUpdate: (v) => {
          ambienceX.current = v;
          nav.style.setProperty("--ambience-x", `${v}px`);
        },
      });
    }
  }, [activeIndex]);

  const handleItemClick = (item: NavItem, index: number) => {
    setActiveIndex(index);
    onItemClick?.(item, index);
  };

  return (
    <div className={cn("relative flex justify-center pt-10", className)}>
      <nav
        ref={navRef}
        style={
          {
            "--spotlight-color": isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)",
            "--ambience-color": isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,0.85)",
          } as unknown as CSSProperties
        }
        className={cn(
          "relative h-11 overflow-hidden rounded-full",
          "border border-white/10 bg-white/[0.06] backdrop-blur-xl",
          "shadow-lg shadow-black/30",
          "transition-all duration-300",
        )}
      >
        <div className="relative z-[10] flex h-full items-center">
          {/* Content */}
          <ul className="hidden h-full items-center gap-0 px-2 sm:flex">
            {items.map((item, idx) => (
              <li key={item.label} className="relative flex h-full items-center justify-center">
                <a
                  href={item.href}
                  data-index={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    handleItemClick(item, idx);
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-white/30",
                    activeIndex === idx
                      ? "text-black dark:text-white"
                      : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {actions ? (
            <div className="flex h-full items-center gap-2 border-l border-white/10 pl-3 pr-2">
              {actions}
            </div>
          ) : null}
        </div>

        {/* 1. The Moving Spotlight (Follows Mouse) */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-full w-full z-[1] transition-opacity duration-300"
          style={{
            opacity: hoverX !== null ? 1 : 0,
            background:
              "radial-gradient(120px circle at var(--spotlight-x) 100%, var(--spotlight-color, rgba(255,255,255,0.16)) 0%, transparent 50%)",
          }}
        />

        {/* 2. The Active State Ambience (Stays on Active) */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full z-[2]"
          style={{
            background:
              "radial-gradient(60px circle at var(--ambience-x) 0%, var(--ambience-color, rgba(255,255,255,1)) 0%, transparent 100%)",
          }}
        />
      </nav>
    </div>
  );
}
