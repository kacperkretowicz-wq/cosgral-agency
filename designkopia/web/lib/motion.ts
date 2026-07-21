"use client";

import { useEffect, useState } from "react";
import type { Variants } from "framer-motion";

/** Czy user woli ograniczony ruch — wszystkie efekty to respektują. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
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
