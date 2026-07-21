"use client";

// effects-stack.yaml → technique: masked-image-reveal (clip-path odsłaniany przy wjeździe)
import { motion } from "framer-motion";
import { EASE_OUT, usePrefersReducedMotion } from "@/lib/motion";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** kierunek odsłaniania */
  from?: "bottom" | "left";
};

export function MaskedReveal({ src, alt, className, from = "bottom" }: Props) {
  const reduced = usePrefersReducedMotion();
  const hidden =
    from === "bottom" ? "inset(100% 0 0 0)" : "inset(0 100% 0 0)";

  return (
    <div className={className} style={{ overflow: "hidden" }}>
      <motion.img
        src={src}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        initial={reduced ? false : { clipPath: hidden, scale: 1.08 }}
        whileInView={reduced ? undefined : { clipPath: "inset(0 0 0 0)", scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 1.0, ease: EASE_OUT }}
      />
    </div>
  );
}
