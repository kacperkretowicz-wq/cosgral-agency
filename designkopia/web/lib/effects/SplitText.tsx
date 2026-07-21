"use client";

// effects-stack.yaml → technique: text-split-reveal (per słowo, bez zewn. zależności)
import { motion, type Variants } from "framer-motion";
import { EASE_OUT, usePrefersReducedMotion } from "@/lib/motion";

type Props = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const word: Variants = {
  hidden: { y: "115%" },
  show: { y: 0, transition: { duration: 0.75, ease: EASE_OUT } },
};

export function SplitText({ text, className, as = "h2" }: Props) {
  const reduced = usePrefersReducedMotion();
  const words = text.split(" ");
  const Tag = motion[as];

  if (reduced) {
    const Plain = as as keyof JSX.IntrinsicElements;
    return <Plain className={className}>{text}</Plain>;
  }

  return (
    <Tag
      className={className}
      aria-label={text}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          aria-hidden
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
        >
          <motion.span variants={word} style={{ display: "inline-block", paddingRight: "0.28em" }}>
            {w}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
