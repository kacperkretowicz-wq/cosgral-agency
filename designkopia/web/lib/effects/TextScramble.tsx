"use client";

// effects-stack.yaml → technique: text-scramble-decode
// Sygnaturowy „wow": litery dekodują się z losowego szumu do finalnego tekstu.
// Trigger: wjazd w viewport (domyślnie), hover lub mount. Bez ciężkich zależności (raw RAF).
import { useEffect, useRef, useState, useCallback } from "react";
import type { ElementType } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

type Trigger = "inView" | "hover" | "mount";

type Props = {
  text: string;
  as?: "span" | "div" | "h1" | "h2" | "h3" | "p";
  className?: string;
  trigger?: Trigger;
  /** Czas pełnego dekodowania w ms. */
  duration?: number;
  /** Zbiór znaków szumu. */
  charset?: string;
  /** Powtarzaj przy każdym ponownym wjeździe w viewport. */
  repeat?: boolean;
};

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ▮▯/\\<>#*+_-0123456789";

export function TextScramble({
  text,
  as = "span",
  className,
  trigger = "inView",
  duration = 900,
  charset = DEFAULT_CHARSET,
  repeat = false,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [display, setDisplay] = useState(text);

  const run = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    // Każda litera ma własny moment „rozwiązania" rozłożony w czasie trwania.
    const resolveAt = Array.from(text, (_, i) =>
      duration * (0.25 + 0.75 * (i / Math.max(text.length, 1))) + Math.random() * (duration * 0.2),
    );
    const tick = (now: number) => {
      const elapsed = now - start;
      let done = true;
      const out = Array.from(text, (ch, i) => {
        if (ch === " ") return " ";
        if (elapsed >= resolveAt[i]) return ch;
        done = false;
        return charset[(Math.random() * charset.length) | 0];
      }).join("");
      setDisplay(out);
      if (!done) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [text, duration, charset]);

  // Reduced motion → zawsze finalny tekst, bez animacji.
  useEffect(() => {
    if (reduced) setDisplay(text);
  }, [reduced, text]);

  useEffect(() => {
    if (reduced || trigger !== "mount") return;
    run();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced, trigger, run]);

  useEffect(() => {
    if (reduced || trigger !== "inView") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            run();
            if (!repeat) io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, trigger, repeat, run]);

  const Comp: ElementType = as;
  return (
    <Comp
      ref={ref as never}
      className={className}
      onMouseEnter={!reduced && trigger === "hover" ? run : undefined}
      aria-label={text}
      style={{ display: "inline-block" }}
    >
      {display}
    </Comp>
  );
}
