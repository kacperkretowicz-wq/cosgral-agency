import type { Metadata } from "next";
import "./globals.css";
import { SmoothScroll, CustomCursor, GrainOverlay } from "@/lib/effects";

export const metadata: Metadata = {
  title: "Design Web — runtime + biblioteka efektów",
  description: "Next/React + Framer + Lenis + GSAP. Mapuje profiles/effects-stack.yaml.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SmoothScroll>
          <CustomCursor />
          <GrainOverlay />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
