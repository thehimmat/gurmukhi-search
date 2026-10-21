import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME_EN, SITE_NAME_PA, SITE_TITLE } from "@/lib/site";
import { getSources } from "@/lib/sources-server";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "Search Sri Guru Granth Sahib Ji by line or look up individual words in the Gurmukhi dictionary.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The texts indexed, from kosh's sources table, in reading order.
  const sources = await getSources();
  return (
    <html lang="pa" className="h-full">
      {/* Every style names the families directly ("Crimson Pro", "Inter",
          "Noto Sans Gurmukhi"), so this one stylesheet serves all three. The
          next/font copies of Crimson Pro and Inter loaded here before were
          never referenced: each font was downloaded twice (#38). */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&family=Noto+Sans+Gurmukhi:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <header style={{ borderBottom: "1px solid var(--border)", backgroundColor: "white" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem 1rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0 0.6rem", whiteSpace: "nowrap" }}>
              <a href="/" className="gurmukhi" style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                {SITE_NAME_PA}
              </a>
              <span style={{ fontFamily: '"Crimson Pro", Georgia, serif', fontSize: "1.05rem", color: "var(--text-secondary)" }}>
                {SITE_NAME_EN}
              </span>
            </div>
            <SiteNav />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem", fontFamily: '"Inter", sans-serif' }}>
          <p>{sources.map((s) => s.name).join(" · ")}</p>
          <p style={{ marginTop: "0.5rem" }}>
            <a href="/about" style={{ color: "var(--accent)", textDecoration: "none" }}>Sources &amp; licensing</a>
            {" · "}
            <a href="https://apps.atthebunga.com" style={{ color: "var(--accent)", textDecoration: "none" }}>More tools at apps.atthebunga.com</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
