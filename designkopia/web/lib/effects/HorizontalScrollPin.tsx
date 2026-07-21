"use client";

// effects-stack.yaml → technique: horizontal-scroll-pin (GSAP ScrollTrigger)
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function HorizontalScrollPin({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !root.current || !track.current) return;
    const ctx = gsap.context(() => {
      const t = track.current!;
      const dist = () => t.scrollWidth - window.innerWidth;
      gsap.to(t, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + dist(),
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={root} className={`relative overflow-hidden ${className ?? ""}`}>
      <div
        ref={track}
        className="flex gap-6 px-6 md:px-16"
        style={reduced ? { overflowX: "auto" } : { width: "max-content" }}
      >
        {children}
      </div>
    </section>
  );
}
