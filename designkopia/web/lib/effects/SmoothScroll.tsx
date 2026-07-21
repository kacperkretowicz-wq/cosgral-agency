"use client";

// effects-stack.yaml → technique: smooth-scroll  (Lenis + GSAP ScrollTrigger sync)
// Root provider. Owija aplikację w layout.tsx. Spina Lenis z GSAP, by piny/scrub
// liczyły scroll tak samo jak reszta efektów.

import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;
    lenis.on("scroll", ScrollTrigger.update);
    const onRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(onRaf);
      lenis.off("scroll", ScrollTrigger.update);
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ lerp: 0.1, smoothWheel: true, autoRaf: false }}
    >
      {children}
    </ReactLenis>
  );
}
