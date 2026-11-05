import { useEffect } from "react";
import { projectBounds } from "../domain/operations";
import { saveCurrentProject } from "../persistence/actions";
import { usePrefs } from "../store/preferencesStore";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

/** Global keyboard shortcuts. Uses `event.code` so they work with Persian keyboard layouts. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const ps = useProjectStore.getState();
      const ui = useUiStore.getState();
      const prefs = usePrefs.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        switch (e.code) {
          case "KeyZ":
            e.preventDefault();
            if (e.shiftKey) ps.redo();
            else ps.undo();
            return;
          case "KeyY":
            e.preventDefault();
            ps.redo();
            return;
          case "KeyD":
            e.preventDefault();
            ps.duplicateSelection();
            return;
          case "KeyA":
            e.preventDefault();
            ps.selectAll();
            return;
          case "KeyS":
            e.preventDefault();
            void saveCurrentProject();
            return;
        }
        return;
      }

      const step = prefs.gridSize * (e.shiftKey ? 5 : 1);
      switch (e.code) {
        case "Delete":
        case "Backspace":
          e.preventDefault();
          ps.deleteSelection();
          break;
        case "KeyR":
          ps.rotateSelection(e.shiftKey ? -90 : 90);
          break;
        case "KeyV":
          ui.setTool("select");
          break;
        case "KeyW":
          ui.setViewMode("2d");
          ui.setTool("wall");
          break;
        case "KeyH":
          ui.setTool("pan");
          break;
        case "KeyG":
          prefs.update({ showGrid: !prefs.showGrid });
          break;
        case "KeyS":
          prefs.update({ snapEnabled: !prefs.snapEnabled });
          break;
        case "Digit2":
          ui.setViewMode("2d");
          break;
        case "Digit3":
          ui.setViewMode("3d");
          break;
        case "Equal":
        case "NumpadAdd":
          ui.zoomBy(1.25);
          break;
        case "Minus":
        case "NumpadSubtract":
          ui.zoomBy(0.8);
          break;
        case "KeyF":
          ui.zoomToFit(projectBounds(ps.project), ps.project.id);
          break;
        case "Escape":
          ps.clearSelection();
          ui.setTool("select");
          break;
        case "ArrowLeft":
          e.preventDefault();
          ps.nudgeSelection(-step, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          ps.nudgeSelection(step, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          ps.nudgeSelection(0, -step);
          break;
        case "ArrowDown":
          e.preventDefault();
          ps.nudgeSelection(0, step);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
