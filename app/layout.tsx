import type { Metadata } from "next";
import { Crimson_Pro, Inter } from "next/font/google";
import "./globals.css";
import { CORPORA, SITE_NAME_EN, SITE_NAME_PA, SITE_TITLE } from "@/lib/site";
import { SiteNav } from "@/components/SiteNav";

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "Search Sri Guru Granth Sahib Ji by line or look up individual words in the Gurmukhi dictionary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pa" className={`${crimsonPro.variable} ${inter.variable} h-full`}>
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
          <p>{CORPORA.join(" · ")}</p>
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
