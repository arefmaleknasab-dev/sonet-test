// Hydrates the real AppShell in jsdom and reports whether the splash clears.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
  url: "https://3000-test.e2b.app/",
  pretendToBeVisual: true,
});
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.getComputedStyle = dom.window.getComputedStyle;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
dom.window.matchMedia = (_q: string) =>
  ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, media: "", dispatchEvent: () => false }) as unknown as MediaQueryList;
g.WebGLRenderingContext = class {};

import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { AppShell } from "../src/features/designer/components/AppShell";

const el = dom.window.document.getElementById("root")!;
const root = createRoot(el);
root.render(createElement(AppShell));

setTimeout(() => {
  const text = el.textContent ?? "";
  const hasSplashOnly = text.trim() === "Cabinex";
  console.log("splash only:", hasSplashOnly);
  console.log("sample:", text.replace(/\s+/g, " ").slice(0, 220));
  process.exit(0);
}, 3000);
