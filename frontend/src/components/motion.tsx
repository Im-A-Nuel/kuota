"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Smooth, eased scrolling (wheel, keyboard and #anchor links) plus scroll reveals.
 * Purpose (R-19): the reveal leads the eye down the page one block at a time, and the eased
 * scroll keeps anchor jumps from feeling like teleports. Both switch off under reduced motion.
 */
export function Motion() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (reducedMotion()) return;
    const lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: -24 },
      duration: 1.1,
      // Dialogs and wide code blocks keep their own native scrolling.
      prevent: (node) => Boolean(node.closest("dialog, pre")),
    });
    lenisRef.current = lenis;
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // New page: jump to the top instead of easing through the old content. Next resets the
  // native scroll; Lenis keeps its own position, so sync it.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion()) {
      root.classList.remove("reveal-ready");
      return;
    }
    root.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const scan = () =>
      document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => io.observe(el));
    scan();

    // Streamed sections (loading.tsx, client lists) arrive after the first scan.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
