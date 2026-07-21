"use client";

// Renderer data-driven: PageSpec -> strona złożona z biblioteki efektów.
// Tokeny z palette-lock/typography-lock nakładane jako CSS vars na wrapper.
// Efekty bramkowane wg tieru (mirror profiles/effects-stack.yaml tiers).
import type { CSSProperties } from "react";
import {
  Reveal,
  RevealItem,
  MaskedReveal,
  ParallaxLayer,
  PinnedSequence,
  Marquee,
  MagneticButton,
  SplitText,
  CountUp,
  MovingShapes,
  ShaderGradientBg,
  WebGLImageDistortion,
  TextScramble,
} from "@/lib/effects";
import type { PageSpec, Section, Tier } from "./types";

const TIER_EFFECTS: Record<Tier, Set<string>> = {
  minimal: new Set(["smooth-scroll", "scroll-reveal-stagger", "image-progressive-reveal", "grain-noise-overlay"]),
  content: new Set(["smooth-scroll", "scroll-reveal-stagger", "number-count-up", "marquee-logos", "grain-noise-overlay"]),
  editorial_motion: new Set([
    "smooth-scroll", "scroll-reveal-stagger", "masked-image-reveal", "parallax-layers",
    "pinned-scroll-sequence", "marquee-logos", "magnetic-button", "text-split-reveal", "grain-noise-overlay",
  ]),
  experimental: new Set([
    "smooth-scroll", "scroll-reveal-stagger", "masked-image-reveal", "parallax-layers", "pinned-scroll-sequence",
    "marquee-logos", "magnetic-button", "text-split-reveal", "text-scramble-decode", "moving-shapes-physics",
    "shader-gradient-bg", "webgl-image-distortion", "horizontal-scroll-pin", "grain-noise-overlay",
  ]),
};

function allow(tier: Tier, id: string) {
  return TIER_EFFECTS[tier].has(id);
}

export default function GeneratedPage({ spec }: { spec: PageSpec }) {
  const t = spec.tokens;
  const wrapperStyle = {
    "--bg": t.bg,
    "--fg": t.fg,
    "--muted": t.muted,
    "--accent": t.accent,
    "--surface": t.surface,
    "--font-heading": t.fontHeading,
    "--font-body": t.fontBody,
    "--font-mono": t.fontMono,
    background: "var(--bg)",
    color: "var(--fg)",
    fontFamily: "var(--font-body)",
  } as CSSProperties;

  return (
    <div style={wrapperStyle}>
      {t.googleFontsUrl && <link rel="stylesheet" href={t.googleFontsUrl} />}
      <main>
        {spec.sections.map((s, i) => (
          <SectionView key={i} s={s} tier={spec.tier} brand={spec.brand} />
        ))}
      </main>
    </div>
  );
}

function Heading({ tier, text, className, as = "h2" }: { tier: Tier; text: string; className?: string; as?: "h1" | "h2" }) {
  if (allow(tier, "text-split-reveal")) return <SplitText as={as} text={text} className={className} />;
  return <Reveal>{as === "h1" ? <h1 className={className}>{text}</h1> : <h2 className={className}>{text}</h2>}</Reveal>;
}

function Cta({ tier, label }: { tier: Tier; label: string }) {
  if (allow(tier, "magnetic-button")) return <MagneticButton>{label}</MagneticButton>;
  return <a href="#" className="inline-flex items-center gap-2 rounded-full bg-fg px-7 py-3 font-mono text-sm text-bg">{label}</a>;
}

function SectionView({ s, tier, brand }: { s: Section; tier: Tier; brand: string }) {
  switch (s.type) {
    case "hero":
      return (
        <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 md:px-16">
          {s.bg === "shader" && allow(tier, "shader-gradient-bg") && <ShaderGradientBg />}
          {allow(tier, "moving-shapes-physics") && <MovingShapes />}
          {s.bg === "image" && s.image && (
            <div aria-hidden className="absolute inset-0">
              <img src={s.image} alt="" className="h-full w-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-bg/40" />
            </div>
          )}
          <div className="relative z-10 mx-auto w-full max-w-6xl">
            {s.eyebrow && <p className="font-mono text-sm text-muted">{s.eyebrow}</p>}
            {s.effects?.includes("text-scramble-decode") && allow(tier, "text-scramble-decode") ? (
              <TextScramble as="h1" trigger="mount" text={s.title} className="font-heading mt-4 block max-w-4xl text-5xl font-extrabold leading-[1.02] md:text-8xl" />
            ) : (
              <Heading tier={tier} as="h1" text={s.title} className="font-heading mt-4 max-w-4xl text-5xl font-extrabold leading-[1.02] md:text-8xl" />
            )}
            {s.lead && <p className="mt-8 max-w-xl text-lg text-muted">{s.lead}</p>}
            {s.cta && <div className="mt-10"><Cta tier={tier} label={s.cta} /></div>}
          </div>
        </section>
      );

    case "marquee":
      return (
        <section className="border-y border-fg/10 py-8">
          <Marquee speedSec={26}>
            {s.items.map((b) => <span key={b} className="font-heading text-2xl text-muted">{b}</span>)}
          </Marquee>
        </section>
      );

    case "gallery": {
      const useMask = allow(tier, "masked-image-reveal");
      const useParallax = allow(tier, "parallax-layers");
      return (
        <section className="mx-auto max-w-6xl px-6 py-28 md:px-16">
          <Reveal>
            {s.tag && <p className="font-mono text-sm text-accent">{s.tag}</p>}
            {s.heading && <h2 className="font-heading mt-3 text-4xl md:text-6xl">{s.heading}</h2>}
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {s.images.map((src, i) => {
              const alt = `${s.heading ?? "kadr"} ${i + 1}`;
              const img = allow(tier, "webgl-image-distortion")
                ? <WebGLImageDistortion src={src} alt={alt} className="aspect-[4/5] overflow-hidden rounded-xl" />
                : useMask
                ? <MaskedReveal src={src} alt={alt} from={i % 2 ? "left" : "bottom"} className="aspect-[4/5] overflow-hidden rounded-xl" />
                : <img src={src} alt="" className="aspect-[4/5] w-full rounded-xl object-cover" />;
              return useParallax
                ? <ParallaxLayer key={i} speed={i % 2 ? -30 : 40} className={i % 2 ? "md:mt-20" : ""}>{img}</ParallaxLayer>
                : <div key={i}>{img}</div>;
            })}
          </div>
        </section>
      );
    }

    case "pinned":
      if (!allow(tier, "pinned-scroll-sequence")) {
        return (
          <section className="mx-auto max-w-5xl px-6 py-28 md:px-16">
            {s.label && <p className="font-mono text-sm text-muted">{s.label}</p>}
            <Reveal as="ul" stagger className="mt-8 space-y-10">
              {s.steps.map((st) => (
                <RevealItem key={st.n}>
                  <span className="font-mono text-accent text-sm">{st.n}</span>
                  <h3 className="font-heading text-3xl md:text-5xl mt-2">{st.title}</h3>
                  <p className="text-muted mt-3 max-w-xl">{st.body}</p>
                </RevealItem>
              ))}
            </Reveal>
          </section>
        );
      }
      return <PinnedSequence steps={s.steps} label={s.label} />;

    case "stats":
      return (
        <section className="mx-auto max-w-5xl px-6 py-28 md:px-16">
          <Reveal as="ul" stagger className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {s.items.map((k) => (
              <RevealItem key={k.label}>
                <div className="font-heading text-5xl md:text-6xl">
                  {allow(tier, "number-count-up")
                    ? <CountUp to={k.value} suffix={k.suffix} decimals={k.decimals ?? 0} />
                    : <span>{k.value}{k.suffix}</span>}
                </div>
                <p className="mt-2 font-mono text-sm text-muted">{k.label}</p>
              </RevealItem>
            ))}
          </Reveal>
        </section>
      );

    case "split":
      return (
        <section className="mx-auto max-w-6xl px-6 py-28 md:px-16">
          <div className={`grid items-center gap-12 md:grid-cols-2 ${s.reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
            <Reveal>
              {s.tag && <p className="font-mono text-sm text-accent">{s.tag}</p>}
              {s.heading && <h2 className="font-heading mt-3 text-4xl md:text-5xl">{s.heading}</h2>}
              {s.body && <p className="mt-5 text-lg text-muted">{s.body}</p>}
            </Reveal>
            {s.image && (
              allow(tier, "masked-image-reveal")
                ? <MaskedReveal src={s.image} alt={s.heading ?? "split"} className="aspect-[4/3] overflow-hidden rounded-xl" />
                : <img src={s.image} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            )}
          </div>
        </section>
      );

    case "faq":
      return (
        <section className="mx-auto max-w-3xl px-6 py-28 md:px-16">
          <Reveal>
            {s.tag && <p className="font-mono text-sm text-accent">{s.tag}</p>}
            {s.heading && <h2 className="font-heading mt-3 text-4xl md:text-5xl">{s.heading}</h2>}
          </Reveal>
          <Reveal as="ul" stagger className="mt-12 divide-y divide-fg/10">
            {s.items.map((f) => (
              <RevealItem key={f.q}>
                <div className="py-6">
                  <dt className="font-heading text-xl">{f.q}</dt>
                  <dd className="mt-2 text-muted">{f.a}</dd>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </section>
      );

    case "cta":
      return (
        <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 text-center">
          {allow(tier, "moving-shapes-physics") && <MovingShapes opacity={0.18} />}
          <div className="relative z-10">
            <Heading tier={tier} text={s.title} className="font-heading text-5xl md:text-7xl" />
            {s.meta && <p className="mt-5 font-mono text-sm text-muted">{s.meta}</p>}
            {s.cta && <div className="mt-10"><Cta tier={tier} label={s.cta} /></div>}
          </div>
        </section>
      );

    case "footer":
      return (
        <footer className="flex items-center justify-between border-t border-fg/10 px-6 py-8 font-mono text-sm text-muted md:px-16">
          <span>{s.brand || brand}®</span>
          <a href="https://cosgral.design" target="_blank" rel="noopener noreferrer">{s.credit ?? "cosgral.design"}</a>
          <span>© 2026</span>
        </footer>
      );

    default:
      return null;
  }
}
