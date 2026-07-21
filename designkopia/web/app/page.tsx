"use client";

// DEMO LANDING — dowód, że stack daje "duszę" (nie 4 zdjęcia + 2 scrolle).
// Build-phase generuje takie strony per job, dobierając tier i techniki z effects-stack.yaml.
import {
  Reveal,
  RevealItem,
  ParallaxLayer,
  PinnedSequence,
  Marquee,
  MagneticButton,
  SplitText,
  CountUp,
  MovingShapes,
  ShaderGradientBg,
  WebGLImageDistortion,
  type Step,
} from "@/lib/effects";

const STEPS: Step[] = [
  { n: "001", title: "Założenie i koncepcja", body: "Z promptu marki: 3 kierunki, paleta i koncepcja do wyboru." },
  { n: "002", title: "Photoshoot i atmosfera", body: "Packshot + sceny, tła, kształty — spójny język wizualny." },
  { n: "003", title: "Layout i motion", body: "Szkielet z mockupów + efekty dobrane do przekazu marki." },
  { n: "004", title: "QA i delivery", body: "Bramki jakości i spójności — dopiero potem oddanie." },
];

const PLACEHOLDER = "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900&q=80&auto=format&fit=crop";

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="relative flex min-h-screen flex-col justify-center px-6 md:px-16">
        <ShaderGradientBg />
        <MovingShapes />
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <p className="font-mono text-sm text-muted">STUDIO — 2026</p>
          <SplitText
            as="h1"
            text="Strony które sprzedają wrażeniem."
            className="font-heading mt-4 max-w-4xl text-5xl font-extrabold leading-[1.02] md:text-8xl"
          />
          <p className="mt-8 max-w-xl text-lg text-muted">
            Generator stron premium: research, koncepcja, photoshoot i motion — z duszą, nie z szablonu.
          </p>
          <div className="mt-10">
            <MagneticButton>Zobacz realizacje →</MagneticButton>
          </div>
        </div>
      </section>

      {/* MARQUEE klientów */}
      <section className="border-y border-fg/10 py-8">
        <Marquee speedSec={26}>
          {["AURÉ", "NOIR", "LUMÉRA", "PATINA", "MATCHA FIELD", "WIŚNIA", "SIOO"].map((b) => (
            <span key={b} className="font-heading text-2xl text-muted">{b}</span>
          ))}
        </Marquee>
      </section>

      {/* GALERIA z masked reveal + parallax */}
      <section className="mx-auto max-w-6xl px-6 py-28 md:px-16">
        <Reveal>
          <p className="font-mono text-sm text-accent">(01) CAMPAIGN</p>
          <h2 className="font-heading mt-3 text-4xl md:text-6xl">Kampanie, nie szablony</h2>
        </Reveal>
        <p className="mt-3 font-mono text-xs text-muted">↳ najedź na kadry — dystorsja WebGL (OGL)</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <ParallaxLayer speed={40}>
            <WebGLImageDistortion src={PLACEHOLDER} alt="Kadr 1" className="aspect-[4/5] overflow-hidden rounded-xl" />
          </ParallaxLayer>
          <ParallaxLayer speed={-30} className="md:mt-24">
            <WebGLImageDistortion src={PLACEHOLDER} alt="Kadr 2" className="aspect-[4/5] overflow-hidden rounded-xl" />
          </ParallaxLayer>
        </div>
      </section>

      {/* PINNED 001–004 */}
      <PinnedSequence steps={STEPS} label="(02) JAK PRACUJEMY" />

      {/* STATY z count-up */}
      <section className="mx-auto max-w-5xl px-6 py-28 md:px-16">
        <Reveal as="ul" stagger className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {[
            { v: 98, s: "%", l: "klientów wraca" },
            { v: 40, s: "+", l: "realizacji" },
            { v: 12, s: "", l: "rynków" },
            { v: 4.9, s: "", l: "ocena", d: 1 },
          ].map((k) => (
            <RevealItem key={k.l}>
              <div className="font-heading text-5xl md:text-6xl">
                <CountUp to={k.v} suffix={k.s} decimals={k.d ?? 0} />
              </div>
              <p className="mt-2 font-mono text-sm text-muted">{k.l}</p>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      {/* CTA */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 text-center">
        <MovingShapes opacity={0.18} />
        <div className="relative z-10">
          <SplitText as="h2" text="Zbudujmy Twoją." className="font-heading text-5xl md:text-7xl" />
          <div className="mt-10">
            <MagneticButton>Prześlij brief →</MagneticButton>
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-fg/10 px-6 py-8 font-mono text-sm text-muted md:px-16">
        <span>STUDIO®</span>
        <a href="https://cosgral.design" target="_blank" rel="noopener noreferrer">cosgral.design</a>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
