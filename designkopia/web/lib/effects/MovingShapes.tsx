"use client";

// effects-stack.yaml → technique: moving-shapes-physics (lekka wersja: dryfujące blobki)
// Realizuje wizję: "przesuwanie kształtów po stronie", dymki/półprzezroczystości.
// Wersja ciężka (kolizje/grawitacja) = matter.js/rapier — patrz effects-stack.yaml.
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion";

type Blob = { size: number; x: string; y: string; color: string; dur: number; delay?: number };

const DEFAULT: Blob[] = [
  { size: 420, x: "8%", y: "12%", color: "var(--accent)", dur: 18 },
  { size: 300, x: "70%", y: "20%", color: "var(--surface)", dur: 22, delay: 2 },
  { size: 360, x: "55%", y: "65%", color: "var(--accent)", dur: 26, delay: 1 },
];

export function MovingShapes({ blobs = DEFAULT, opacity = 0.22 }: { blobs?: Blob[]; opacity?: number }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            background: b.color,
            borderRadius: "50%",
            filter: "blur(60px)",
            opacity,
          }}
          animate={
            reduced
              ? undefined
              : { x: [0, 40, -30, 0], y: [0, -50, 30, 0], scale: [1, 1.1, 0.95, 1] }
          }
          transition={{ duration: b.dur, delay: b.delay ?? 0, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
