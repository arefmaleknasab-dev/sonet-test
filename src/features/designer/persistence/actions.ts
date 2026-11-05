import { projectRepository, parseProject } from "./repository";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";

/** High-level persistence commands shared by toolbar, shortcuts and autosave. */
export async function saveCurrentProject(opts: { silent?: boolean } = {}) {
  const { project, markSaved } = useProjectStore.getState();
  const toSave = { ...project, updatedAt: Date.now() };
  try {
    await projectRepository.save(toSave);
    projectRepository.setLastId(toSave.id);
    markSaved(toSave);
    if (!opts.silent) useUiStore.getState().showToast("پروژه ذخیره شد", "success");
  } catch {
    useUiStore.getState().showToast("ذخیره‌سازی ناموفق بود", "error");
  }
}

export async function openProjectById(id: string) {
  const p = await projectRepository.get(id);
  if (!p) {
    useUiStore.getState().showToast("پروژه پیدا نشد", "error");
    return;
  }
  useProjectStore.getState().replaceProject(p, { saved: true });
  projectRepository.setLastId(p.id);
  useUiStore.getState().showToast(`«${p.name}» باز شد`);
}

export function exportProjectJson() {
  const { project } = useProjectStore.getState();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name || "cabinex-project"}.cabinex.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectFile(file: File) {
  try {
    const parsed = parseProject(JSON.parse(await file.text()));
    if (!parsed) throw new Error("invalid");
    useProjectStore.getState().replaceProject(parsed);
    useUiStore.getState().showToast("پروژه وارد شد", "success");
  } catch {
    useUiStore.getState().showToast("فایل پروژه معتبر نیست", "error");
  }
}
