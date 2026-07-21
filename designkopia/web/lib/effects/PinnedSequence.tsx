"use client";

// effects-stack.yaml → technique: pinned-scroll-sequence ("HOW WE CREATE 001–004")
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export type Step = { n: string; title: string; body: string };

export function PinnedSequence({ steps, label }: { steps: Step[]; label?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !root.current) return;
    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".pin-step");
      gsap.set(panels, { autoAlpha: 0, y: 30 });
      gsap.set(panels[0], { autoAlpha: 1, y: 0 });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * steps.length,
          pin: true,
          scrub: 0.6,
        },
      });
      panels.forEach((p, i) => {
        if (i === 0) return;
        tl.to(panels[i - 1], { autoAlpha: 0, y: -30, duration: 0.4 })
          .to(p, { autoAlpha: 1, y: 0, duration: 0.4 }, "<");
      });
    }, root);
    return () => ctx.revert();
  }, [steps.length, reduced]);

  return (
    <section ref={root} className="relative min-h-screen flex items-center">
      <div className="mx-auto w-full max-w-5xl px-6">
        {label && <p className="font-mono text-sm text-muted mb-8">{label}</p>}
        <div className="relative min-h-[40vh]">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="pin-step absolute inset-0"
              style={reduced ? { position: "relative", marginBottom: "3rem" } : undefined}
            >
              <span className="font-mono text-accent text-sm">{s.n}</span>
              <h3 className="font-heading text-4xl md:text-6xl mt-3 max-w-3xl">{s.title}</h3>
              <p className="text-muted mt-5 max-w-xl text-lg">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
