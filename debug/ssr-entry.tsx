import { renderToString } from "react-dom/server";
import { AppShell } from "../src/features/designer/components/AppShell";

const html = renderToString(<AppShell />);
console.log("SSR OK len=", html.length, "|", html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160));
