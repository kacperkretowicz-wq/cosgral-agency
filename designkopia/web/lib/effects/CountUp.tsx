"use client";

// effects-stack.yaml → technique: number-count-up
import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";
import { EASE_OUT, usePrefersReducedMotion } from "@/lib/motion";

type Props = {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  durationSec?: number;
  className?: string;
};

export function CountUp({ to, suffix = "", prefix = "", decimals = 0, durationSec = 1.4, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = usePrefersReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration: durationSec,
      ease: EASE_OUT,
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, durationSec, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
