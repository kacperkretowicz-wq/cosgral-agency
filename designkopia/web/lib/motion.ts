"use client";

import { useEffect, useState } from "react";
import type { Variants } from "framer-motion";

/** Czy user woli ograniczony ruch — wszystkie efekty to respektują. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setReduced(false);
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    }
    // Safari/older desktop engines expose addListener/removeListener instead.
    if (typeof mq.addListener === "function") {
      mq.addListener(on);
      return () => mq.removeListener(on);
    }
    return;
  }, []);
  return reduced;
}

export const EASE_OUT = [0.16, 1, 0.3, 1] as const; // expo-out, „z gracją”

/** Wariant wejścia (fade + lift) z kontrolą stagger przez rodzica. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
