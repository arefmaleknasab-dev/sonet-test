// Simulates the client boot path (AppShell effect) with a fake window/localStorage.
const store: Record<string, string> = {};
const g = globalThis as unknown as Record<string, unknown>;
g.window = {
  localStorage: {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
g.document = { documentElement: { dataset: {} as Record<string, string> }, addEventListener() {}, removeEventListener() {} };

import { createProject, DEFAULT_NEW_PROJECT } from "../src/features/designer/domain/factory";
import { projectRepository } from "../src/features/designer/persistence/repository";
import { createUnitFromDef } from "../src/features/designer/domain/factory";
import { getDefinition } from "../src/features/designer/domain/catalog";

(async () => {
  const p = createProject(DEFAULT_NEW_PROJECT);
  const def = getDefinition("param-base")!;
  p.units.push(createUnitFromDef(def, { x: 0, y: 0 }));
  await projectRepository.save(p);
  projectRepository.setLastId(p.id);
  const loaded = await projectRepository.get(projectRepository.getLastId()!);
  console.log("loaded units:", loaded?.units.length, "params:", JSON.stringify(loaded?.units[0]?.params)?.slice(0, 120));
  console.log("raw keys:", Object.keys(store));
})();
