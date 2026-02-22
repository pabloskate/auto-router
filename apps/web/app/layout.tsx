import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Router",
  description: "Transparent OpenRouter model routing with daily benchmark ingestion"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div>
              <p className="eyebrow">Cloudflare + OpenRouter</p>
              <h1>Auto Router</h1>
            </div>
            <nav>
              <a href="/">Overview</a>
              <a href="/chat">Chat</a>
              <a href="/admin">Admin</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
