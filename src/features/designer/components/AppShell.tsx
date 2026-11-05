"use client";

import { useEffect, useState } from "react";
import { createProject, DEFAULT_NEW_PROJECT } from "../domain/factory";
import { useApplyTheme } from "../hooks/useTheme";
import { useShortcuts } from "../hooks/useShortcuts";
import { saveCurrentProject } from "../persistence/actions";
import { projectRepository, readProjectSync } from "../persistence/repository";
import { usePrefs } from "../store/preferencesStore";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { Canvas2D } from "./canvas2d/Canvas2D";
import { FontLoader } from "./FontLoader";
import { NewProjectDialog } from "./dialogs/NewProjectDialog";
import { OpenProjectDialog } from "./dialogs/OpenProjectDialog";
import { PreferencesDialog } from "./dialogs/PreferencesDialog";
import { LibrarySidebar } from "./library/LibrarySidebar";
import { PropertiesPanel } from "./properties/PropertiesPanel";
import { StatusBar } from "./StatusBar";
import { ToastHost } from "./Toast";
import { TopToolbar } from "./TopToolbar";
import { Viewport3D } from "./viewport3d/Viewport3D";

function Workspace() {
  const viewMode = useUiStore((s) => s.viewMode);
  const libraryPosition = usePrefs((s) => s.libraryPosition);
  const autoSave = usePrefs((s) => s.autoSave);
  const dirty = useProjectStore((s) => s.dirty);
  const project = useProjectStore((s) => s.project);

  useShortcuts();

  // Debounced autosave
  useEffect(() => {
    if (!autoSave || !dirty) return;
    const t = setTimeout(() => void saveCurrentProject({ silent: true }), 1500);
    return () => clearTimeout(t);
  }, [autoSave, dirty, project]);

  return (
    <div className="flex h-screen flex-col bg-bg text-fg" dir="rtl">
      <TopToolbar />
      {/* Physical layout (LTR) so the library sits on the left and properties on the right by default. */}
      <div className={`flex min-h-0 flex-1 ${libraryPosition === "right" ? "flex-row-reverse" : "flex-row"}`} dir="ltr">
        <LibrarySidebar />
        <main className="relative min-w-0 flex-1">{viewMode === "2d" ? <Canvas2D /> : <Viewport3D />}</main>
        <PropertiesPanel />
      </div>
      <StatusBar />
      <PreferencesDialog />
      <NewProjectDialog />
      <OpenProjectDialog />
      <ToastHost />
    </div>
  );
}

export function AppShell() {
  const [ready, setReady] = useState(false);
  useApplyTheme();

  // Restore the last project (or start with a default kitchen) once on the client.
  // Boot is fail-safe: a storage/quota/parse problem must never leave the app on the splash.
  useEffect(() => {
    let alive = true;
    const boot = () => {
      try {
        const lastId = projectRepository.getLastId();
        const last = readProjectSync(lastId);
        if (last) useProjectStore.getState().replaceProject(last, { saved: true });
        else useProjectStore.getState().replaceProject(createProject(DEFAULT_NEW_PROJECT));
      } catch {
        useProjectStore.getState().replaceProject(createProject(DEFAULT_NEW_PROJECT));
      } finally {
        if (alive) setReady(true);
      }
    };
    boot();
    // Watchdog: if anything asynchronous ever blocks the boot, show the workspace anyway.
    const t = setTimeout(() => {
      if (alive) setReady(true);
    }, 1500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-bg text-muted" dir="rtl">
        <FontLoader />
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-accent" />
          <span className="text-[13px]" dir="ltr">
            Cabinex
          </span>
        </div>
      </div>
    );
  }
  return (
    <>
      <FontLoader />
      <Workspace />
    </>
  );
}
