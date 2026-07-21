"use client";

// effects-stack.yaml → technique: custom-cursor (kropka + pierścień, spring)
import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 250, damping: 28, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 250, damping: 28, mass: 0.5 });

  useEffect(() => {
    // tylko desktop z myszą
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.body.dataset.customCursor = "on";
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      delete document.body.dataset.customCursor;
    };
  }, [x, y]);

  return (
    <>
      <motion.div
        aria-hidden
        style={{ left: x, top: y }}
        className="pointer-events-none fixed z-[9999] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
      />
      <motion.div
        aria-hidden
        style={{ left: rx, top: ry }}
        className="pointer-events-none fixed z-[9998] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fg/40 mix-blend-difference"
      />
    </>
  );
}
