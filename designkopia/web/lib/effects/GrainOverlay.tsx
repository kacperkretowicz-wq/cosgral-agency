"use client";

// effects-stack.yaml → technique: grain-noise-overlay (kino-feel, nie "flat AI")
export function GrainOverlay({ opacity = 0.06 }: { opacity?: number }) {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9990]"
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
}
