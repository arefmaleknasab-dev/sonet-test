import { useEffect, useLayoutEffect, useState } from "react";
import { usePrefs } from "../store/preferencesStore";

/** Resolves "system" into a concrete light/dark value and keeps <html> attributes in sync. */
export function useResolvedTheme(): "light" | "dark" {
  const mode = usePrefs((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}

export function useApplyTheme() {
  const resolved = useResolvedTheme();
  const accent = usePrefs((s) => s.accent);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.accent = accent;
  }, [resolved, accent]);
}
