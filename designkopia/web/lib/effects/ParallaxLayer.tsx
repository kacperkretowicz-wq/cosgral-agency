"use client";

// effects-stack.yaml → technique: parallax-layers
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** dodatni = wolniej (w tył), ujemny = szybciej. px przesunięcia na pełnej drodze. */
  speed?: number;
};

export function ParallaxLayer({ children, className, speed = 60 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      <motion.div style={reduced ? undefined : { y }}>{children}</motion.div>
    </div>
  );
}
