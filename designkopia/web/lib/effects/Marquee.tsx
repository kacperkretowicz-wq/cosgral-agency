"use client";

// effects-stack.yaml → technique: marquee-logos (nieskończona taśma)
import { Children } from "react";

type Props = {
  children: React.ReactNode;
  speedSec?: number;
  reverse?: boolean;
  className?: string;
};

export function Marquee({ children, speedSec = 28, reverse = false, className }: Props) {
  const items = Children.toArray(children);
  return (
    <div className={`marquee-wrap overflow-hidden ${className ?? ""}`} aria-hidden>
      <div
        className="marquee-track flex w-max gap-12 will-change-transform"
        style={{
          animation: `marquee ${speedSec}s linear infinite${reverse ? " reverse" : ""}`,
        }}
      >
        {[...items, ...items].map((c, i) => (
          <div key={i} className="shrink-0">{c}</div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
