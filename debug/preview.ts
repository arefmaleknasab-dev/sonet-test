import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildAssembly } from "../src/features/designer/domain/parametric";

const MM = 0.001;
const cache = new Map<string, THREE.MeshStandardMaterial>();
const getMat = (color: number, key: string) => {
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
    cache.set(key, m);
  }
  return m;
};

const ROLE: Record<string, number> = {
  stretcher: 0x8f9094,
  leftBody: 0x8ce7e4,
  rightBody: 0x2b2bd4,
  bottom: 0xd83232,
  backRail: 0xe3aab2,
  sheet: 0x4fae27,
  foot: 0x5b616b,
};

const params = new URLSearchParams(location.search);
const W = Number(params.get("w") || 600);
const H = Number(params.get("h") || 720);
const D = Number(params.get("d") || 500);
const g = Number(params.get("g") || 6);
const ft = Number(params.get("ft") || 100);

const asm = buildAssembly({
  width: W,
  height: H,
  depth: D,
  params: { grooveDepth: g, feet: { enabled: true, diameter: 40, height: ft, inset: 55 } },
});

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd9d9d9);
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, (H / 2) * MM, 0);
const s = Math.max(W, H, D) * MM;
camera.position.set(s * 1.1, s * 1.15, s * 1.5);
controls.update();

scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.4));
const d1 = new THREE.DirectionalLight(0xffffff, 1.8);
d1.position.set(2, 4, 3);
scene.add(d1);
const d2 = new THREE.DirectionalLight(0xffffff, 0.5);
d2.position.set(-3, 2, -3);
scene.add(d2);
scene.add(new THREE.GridHelper(4, 20, 0x999999, 0xbbbbbb));

for (const part of asm.parts) {
  const mat = getMat(ROLE[part.role], part.role);
  let mesh: THREE.Mesh;
  if (part.shape === "box") {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max((part.x1 - part.x0) * MM, 0.0001),
        Math.max((part.y1 - part.y0) * MM, 0.0001),
        Math.max((part.z1 - part.z0) * MM, 0.0001),
      ),
      mat,
    );
    mesh.position.set(((part.x0 + part.x1) / 2) * MM, ((part.y0 + part.y1) / 2) * MM, ((part.z0 + part.z1) / 2) * MM);
  } else {
    mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(part.radius * MM, part.radius * MM, Math.max((part.y1 - part.y0) * MM, 0.0001), 24),
      mat,
    );
    mesh.position.set(part.cx * MM, ((part.y0 + part.y1) / 2) * MM, part.cz * MM);
  }
  scene.add(mesh);
  scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.55 })));
  // keep edges attached
  scene.children[scene.children.length - 1].position.copy(mesh.position);
}

function anim() {
  requestAnimationFrame(anim);
  controls.update();
  renderer.render(scene, camera);
}
anim();

// expose metrics for verification
(window as unknown as { __metrics: unknown }).__metrics = {
  metrics: asm.metrics,
  issues: asm.issues,
  cutList: asm.cutList,
  parts: asm.parts.length,
};
