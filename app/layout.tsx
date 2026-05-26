import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ਗੁਰਬਾਣੀ ਖੋਜ — Gurbani Search",
  description: "Search Sri Guru Granth Sahib Ji by first letter, pattern, or contains — with Gurmukhi Unicode support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pa" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500&family=Noto+Sans+Gurmukhi:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: '"Inter", sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
