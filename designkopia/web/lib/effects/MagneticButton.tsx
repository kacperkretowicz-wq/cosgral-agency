"use client";

// effects-stack.yaml → technique: magnetic-button
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  href?: string;
  className?: string;
  strength?: number; // 0..1 jak mocno przyciąga
};

export function MagneticButton({ children, href, className, strength = 0.4 }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = usePrefersReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  function onMove(e: React.MouseEvent) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.a
      ref={ref}
      href={href ?? "#"}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy, display: "inline-flex" }}
      className={
        className ??
        "items-center gap-2 rounded-full bg-fg px-7 py-3 font-mono text-sm text-bg"
      }
    >
      {children}
    </motion.a>
  );
}
