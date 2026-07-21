// Biblioteka efektów — mapuje profiles/effects-stack.yaml na komponenty.
// Każdy komponent respektuje prefers-reduced-motion.
export { default as SmoothScroll } from "./SmoothScroll"; // smooth-scroll
export { Reveal, RevealItem } from "./Reveal"; // scroll-reveal-stagger
export { MaskedReveal } from "./MaskedReveal"; // masked-image-reveal
export { ParallaxLayer } from "./ParallaxLayer"; // parallax-layers
export { PinnedSequence, type Step } from "./PinnedSequence"; // pinned-scroll-sequence
export { Marquee } from "./Marquee"; // marquee-logos
export { MagneticButton } from "./MagneticButton"; // magnetic-button
export { CustomCursor } from "./CustomCursor"; // custom-cursor
export { SplitText } from "./SplitText"; // text-split-reveal
export { CountUp } from "./CountUp"; // number-count-up
export { MovingShapes } from "./MovingShapes"; // moving-shapes-physics
export { GrainOverlay } from "./GrainOverlay"; // grain-noise-overlay
export { ShaderGradientBg } from "./ShaderGradientBg"; // shader-gradient-bg (WebGL/OGL)
export { WebGLImageDistortion } from "./WebGLImageDistortion"; // webgl-image-distortion (OGL)
export { HorizontalScrollPin } from "./HorizontalScrollPin"; // horizontal-scroll-pin (GSAP)
export { TextScramble } from "./TextScramble"; // text-scramble-decode (raw RAF, signature)
