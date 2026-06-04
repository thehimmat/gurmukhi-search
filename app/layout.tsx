import type { Metadata } from "next";
import { Crimson_Pro, Inter } from "next/font/google";
import "./globals.css";

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
  title: "ਗੁਰਬਾਣੀ ਖੋਜ · ਕੋਸ਼ — Gurbani Search & Dictionary",
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
          <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
              <a href="/" style={{ fontFamily: '"Crimson Pro", Georgia, serif', fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                ਗੁਰਬਾਣੀ ਖੋਜ · ਕੋਸ਼
              </a>
            </div>
            <a href="https://apps.atthebunga.com" style={{ fontFamily: '"Inter", sans-serif', fontSize: "0.78rem", color: "var(--text-secondary)", textDecoration: "none" }}>
              apps.atthebunga.com
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem", fontFamily: '"Inter", sans-serif' }}>
          <p>Word data from <a href="https://banidb.com" target="_blank" rel="noopener noreferrer">BaniDB</a> · Sri Guru Granth Sahib Ji</p>
        </footer>
      </body>
    </html>
  );
}
