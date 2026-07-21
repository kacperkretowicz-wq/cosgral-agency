"use client";

// effects-stack.yaml → technique: scroll-reveal-stagger
import { motion } from "framer-motion";
import { revealVariants, staggerParent, usePrefersReducedMotion } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  as?: "div" | "section" | "ul" | "li" | "span";
  className?: string;
  stagger?: boolean; // true = animuj dzieci kaskadowo (każde dziecko owiń <RevealItem>)
};

export function Reveal({ children, as = "div", className, stagger = false }: Props) {
  const reduced = usePrefersReducedMotion();
  const Comp = motion[as];
  if (reduced) {
    const Plain = as as keyof JSX.IntrinsicElements;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Comp
      className={className}
      variants={stagger ? staggerParent : revealVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
    >
      {children}
    </Comp>
  );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealVariants}>
      {children}
    </motion.div>
  );
}
