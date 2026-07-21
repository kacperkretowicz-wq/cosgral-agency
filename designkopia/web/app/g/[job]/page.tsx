import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import GeneratedPage from "@/lib/render/GeneratedPage";
import type { PageSpec } from "@/lib/render/types";

// Spec per job emituje scripts/build-page.py do web/generated/<job>.json
const GEN_DIR = path.join(process.cwd(), "generated");

export const dynamicParams = true;

export function generateStaticParams() {
  if (!existsSync(GEN_DIR)) return [];
  return readdirSync(GEN_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ job: f.replace(/\.json$/, "") }));
}

function loadSpec(job: string): PageSpec | null {
  const p = path.join(GEN_DIR, `${job}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as PageSpec;
  } catch {
    return null;
  }
}

export function generateMetadata({ params }: { params: { job: string } }) {
  const spec = loadSpec(params.job);
  return { title: spec ? `${spec.brand} — ${spec.job}` : params.job };
}

export default function Page({ params }: { params: { job: string } }) {
  const spec = loadSpec(params.job);
  if (!spec) notFound();
  return <GeneratedPage spec={spec} />;
}
