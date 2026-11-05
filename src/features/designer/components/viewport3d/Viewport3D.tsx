"use client";

import { Box, Eye, EyeOff, Home, ScanEye } from "lucide-react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { WallMode3D } from "../../domain/types";
import { useResolvedTheme } from "../../hooks/useTheme";
import { usePrefs } from "../../store/preferencesStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { Segmented } from "../ui/controls";
import { buildProjectGroup, type BuiltScene } from "./buildScene";

interface Engine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sun: THREE.DirectionalLight;
  render: () => void;
  built: BuiltScene | null;
  fitted: boolean;
  fit: (center: THREE.Vector3, size: number) => void;
}

export function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);

  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const wallMode = useUiStore((s) => s.wallMode);
  const theme = useResolvedTheme();
  const accent = usePrefs((s) => s.accent);

  /* ---------- engine lifecycle ---------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(5, 4, 6);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 0.8;
    controls.maxDistance = 40;
    controls.enableDamping = false;

    let raf = 0;
    const render = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        renderer.render(scene, camera);
      });
    };
    controls.addEventListener("change", render);

    const engine: Engine = {
      renderer,
      scene,
      camera,
      controls,
      sun,
      render,
      built: null,
      fitted: false,
      fit: (center, size) => {
        camera.position.set(center.x + size * 0.55, size * 0.95, center.z + size * 1.1);
        controls.target.copy(center);
        controls.update();
        render();
      },
    };
    engineRef.current = engine;

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      controls.dispose();
      engine.built?.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      engineRef.current = null;
    };
  }, []);

  /* ---------- scene content ---------- */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0f9d8a";
    const dark = theme === "dark";

    if (engine.built) {
      engine.scene.remove(engine.built.group);
      engine.built.dispose();
    }
    const built = buildProjectGroup(project, selection, wallMode, { dark, accent: accentColor });
    engine.built = built;
    engine.scene.add(built.group);
    engine.scene.background = new THREE.Color(dark ? 0x161a21 : 0xe9ecf1);

    const s = built.size;
    engine.sun.position.set(built.center.x + s * 0.6, s * 1.6, built.center.z + s * 0.5);
    engine.sun.target.position.copy(built.center);
    const cam = engine.sun.shadow.camera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 0.1;
    cam.far = s * 5;
    cam.updateProjectionMatrix();

    if (!engine.fitted) {
      engine.fitted = true;
      engine.fit(built.center, built.size);
    }
    engine.render();
  }, [project, selection, wallMode, theme, accent]);

  /* ---------- picking ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const engine = engineRef.current;
    const down = downRef.current;
    downRef.current = null;
    if (!engine || !down || !engine.built) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;

    const rect = engine.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, engine.camera);
    const hits = ray.intersectObjects(engine.built.group.children, true);
    let id: string | null = null;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.entityId) o = o.parent;
      if (o) {
        id = o.userData.entityId as string;
        break;
      }
    }
    const ps = useProjectStore.getState();
    if (id) ps.select([id], e.shiftKey ? "toggle" : "replace");
    else if (!e.shiftKey) ps.clearSelection();
  };

  const wallOptions: { value: WallMode3D; label: string }[] = [
    { value: "full", label: "کامل" },
    { value: "ghost", label: "شفاف" },
    { value: "hidden", label: "مخفی" },
  ];

  return (
    <div className="absolute inset-0 bg-canvas">
      <div ref={mountRef} className="absolute inset-0" onPointerDown={onPointerDown} onPointerUp={onPointerUp} />

      <div className="absolute start-3 top-3 flex items-center gap-2 rounded-xl border border-line bg-panel/90 p-1.5 shadow-[var(--shadow)] backdrop-blur" dir="rtl">
        <span className="flex items-center gap-1 ps-1.5 text-[11px] text-muted">
          {wallMode === "hidden" ? <EyeOff size={14} /> : <Eye size={14} />}
          دیوارها
        </span>
        <Segmented options={wallOptions} value={wallMode} onChange={(v) => useUiStore.getState().setWallMode(v)} />
        <button
          type="button"
          title="بازنشانی دوربین"
          onClick={() => {
            const e = engineRef.current;
            if (e?.built) e.fit(e.built.center, e.built.size);
          }}
          className="grid h-8 w-8 place-items-center rounded-lg text-fg/80 hover:bg-panel2"
        >
          <Home size={16} />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center" dir="rtl">
        <div className="flex items-center gap-2 rounded-full border border-line bg-panel/80 px-3 py-1 text-[11.5px] text-muted backdrop-blur">
          <ScanEye size={13} />
          چرخش: کشیدن • جابه‌جایی: کلیک راست • زوم: اسکرول • کلیک روی یونیت: انتخاب
          <Box size={13} />
        </div>
      </div>
    </div>
  );
}
