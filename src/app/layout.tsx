import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cabinex | طراحی کابینت",
  description: "نرم‌افزار حرفه‌ای طراحی کابینت با محیط طراحی تعاملی ۲ بعدی و ۳ بعدی",
};

// Applies theme/accent before first paint to avoid a flash of the wrong theme.
const themeScript = `try{var p=(JSON.parse(localStorage.getItem('cabinex:prefs')||'{}').state)||{};var t=p.theme||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.dataset.accent=p.accent||'teal';}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/*
          No render-blocking webfont <link> here: FontLoader injects Vazirmatn after
          hydration so an unreachable font CDN can never freeze the first paint.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
