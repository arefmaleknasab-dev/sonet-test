"use client";

import { useEffect } from "react";

const HREF =
  "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap";

/**
 * Loads the Persian UI font *after* the app is interactive.
 *
 * A render-blocking <link> in <head> would freeze the first paint whenever the
 * font CDN is slow or unreachable (offline previews), which surfaced as an app
 * stuck on its splash screen. Injecting it from an effect keeps first paint
 * instant; the CSS font stack falls back to Tahoma/system-ui until it arrives.
 */
export function FontLoader() {
  useEffect(() => {
    if (document.querySelector("link[data-cabinex-font]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = HREF;
    link.dataset.cabinexFont = "vazirmatn";
    link.addEventListener("error", () => link.remove());
    document.head.appendChild(link);
  }, []);
  return null;
}
