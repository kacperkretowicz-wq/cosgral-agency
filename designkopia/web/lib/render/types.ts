// Schemat page-spec — kontrakt między pipeline (Python) a rendererem (React).
// build-page.py emituje PageSpec do web/generated/<job>.json; GeneratedPage go renderuje.

export type Tier = "minimal" | "content" | "editorial_motion" | "experimental";

export type Tokens = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  surface: string;
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  googleFontsUrl?: string;
};

export type Section =
  | { type: "hero"; eyebrow?: string; title: string; lead?: string; cta?: string; bg?: "shader" | "image" | "plain"; image?: string; effects?: string[] }
  | { type: "marquee"; items: string[] }
  | { type: "gallery"; tag?: string; heading?: string; images: string[]; effects?: string[] }
  | { type: "pinned"; label?: string; steps: { n: string; title: string; body: string }[] }
  | { type: "stats"; items: { value: number; suffix?: string; decimals?: number; label: string }[] }
  | { type: "split"; tag?: string; heading?: string; body?: string; image?: string; reverse?: boolean }
  | { type: "faq"; tag?: string; heading?: string; items: { q: string; a: string }[] }
  | { type: "cta"; title: string; cta?: string; meta?: string }
  | { type: "footer"; brand: string; credit?: string };

export type PageSpec = {
  job: string;
  brand: string;
  tier: Tier;
  tokens: Tokens;
  sections: Section[];
};
