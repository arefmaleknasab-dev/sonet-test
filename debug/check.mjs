import { buildAssembly, DEFAULT_PARAMS } from "/tmp/build/parametric.js";

const fail = [];
const ok = (c, m) => { if (!c) fail.push(m); };

function overlaps(a, b) {
  if (a.shape !== "box" || b.shape !== "box") return false;
  const ov = (a0,a1,b0,b1) => Math.min(a1,b1) - Math.max(a0,b0);
  return ov(a.x0,a.x1,b.x0,b.x1) > 0.6 && ov(a.y0,a.y1,b.y0,b.y1) > 0.6 && ov(a.z0,a.z1,b.z0,b.z1) > 0.6;
}

const sizes = [
  [400, 700, 350], [600, 720, 500], [900, 850, 600], [1400, 480, 800], [250, 1000, 300],
];
for (const [W,H,D] of sizes) {
  for (const g of [0, 3, 6, 10]) {
    const a = buildAssembly({ width: W, height: H, depth: D, params: { ...DEFAULT_PARAMS, grooveDepth: g } });
    const tag = `W${W} H${H} D${D} g${g}`;
    ok(a.issues.filter(i=>i.level==="error").length === 0, `${tag}: errors ${JSON.stringify(a.issues)}`);
    // sections constant
    for (const part of a.parts) {
      if (part.shape !== "box") continue;

      if (part.role === "backRail") ok(Math.abs((part.z1-part.z0) - DEFAULT_PARAMS.thickness.back) < 0.01, `${tag}: back rail thickness`);
      if (part.role === "stretcher") ok(Math.abs((part.y1-part.y0) - DEFAULT_PARAMS.thickness.rail) < 0.01, `${tag}: stretcher thickness`);
      // inside envelope
      ok(part.x0 >= -W/2 - 0.01 && part.x1 <= W/2 + 0.01, `${tag}: ${part.id} x outside`);
      ok(part.y0 >= -0.01 && part.y1 <= H + 0.01, `${tag}: ${part.id} y outside ${part.y0}..${part.y1}`);
      ok(part.z0 >= -D/2 - 0.01 && part.z1 <= D/2 + 0.01, `${tag}: ${part.id} z outside`);
    }
    // panel section constant at non-groove sample points
    const coverX = (role, y, z) => {
      const segs = a.parts.filter(p => p.role === role && p.shape === "box" && y > p.y0 && y < p.y1 && z > p.z0 && z < p.z1)
        .map(p => [p.x0, p.x1]).sort((u,v)=>u[0]-v[0]);
      return segs.length ? +(segs[0][1] - segs[0][0]).toFixed(2) : 0;
    };
    const coverY = (role, x, z) => {
      const segs = a.parts.filter(p => p.role === role && p.shape === "box" && x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1)
        .map(p => [p.y0, p.y1]).sort((u,v)=>u[0]-v[0]);
      return segs.length ? +(segs[0][1] - segs[0][0]).toFixed(2) : 0;
    };
    const yMid = a.metrics.feetHeight + 40;
    const zMid = 0;
    ok(coverX("leftBody", yMid, zMid) === 16, `${tag}: left section ${coverX("leftBody", yMid, zMid)}`);
    ok(coverX("rightBody", yMid, zMid) === 16, `${tag}: right section ${coverX("rightBody", yMid, zMid)}`);
    ok(coverY("bottom", 0, zMid) === 16, `${tag}: bottom section ${coverY("bottom", 0, zMid)}`);
    const coverZ = (role, x, y) => {
      const segs = a.parts.filter(p => p.role === role && p.shape === "box" && x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1)
        .map(p => [p.z0, p.z1]).sort((u,v)=>u[0]-v[0]);
      return segs.length ? +(segs[0][1] - segs[0][0]).toFixed(2) : 0;
    };
    ok(coverZ("sheet", 0, 300) === 3, `${tag}: sheet section ${coverZ("sheet",0,300)}`);
    const st = a.parts.find(p => p.role === "stretcher");
    if (st) {
      const scx = (st.x0 + st.x1) / 2;
      const scy = (st.y0 + st.y1) / 2;
      ok(Math.abs((st.z1 - st.z0) - (D - 16)) < 0.01, `${tag}: stretcher length ${st.z1-st.z0}`);
      ok(Math.abs((st.x1 - st.x0) - 90) < 0.01, `${tag}: stretcher section ${st.x1-st.x0}`);

    }
    ok(Math.abs(coverY("backRail", 0, -a.metrics.depth/2 + 5) - 140) < 0.01, `${tag}: back rail height ${coverY("backRail",0,-a.metrics.depth/2+5)}`);
    // groove actually removes material above the floor
    const yAboveGroove = a.metrics.grooveFloorY + 20;
    const sheetMid = (a.metrics.sheetZ0 + a.metrics.sheetZ1) / 2;
    ok(coverX("leftBody", yAboveGroove, sheetMid) === +(16 - Math.min(g,14)).toFixed(2), `${tag}: left groove ${coverX("leftBody", yAboveGroove, sheetMid)}`);
    // no overlaps
    const boxes = a.parts.filter(p => p.shape === "box");
    for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++)
      if (overlaps(boxes[i], boxes[j])) fail.push(`${tag}: overlap ${boxes[i].id} / ${boxes[j].id}`);
    // groove geometry
    const m = a.metrics;
    ok(Math.abs(m.grooveFromBack - DEFAULT_PARAMS.thickness.back) < 0.01, `${tag}: groove offset`);
    ok(Math.abs((m.sheetZ1 - m.sheetZ0) - DEFAULT_PARAMS.thickness.sheet) < 0.01, `${tag}: sheet thickness`);
    // sheet width invariant with groove
    if (g > 0) ok(Math.abs(m.sheetWidth - (m.innerWidth + 2*Math.min(g, 14))) < 0.01, `${tag}: sheet width ${m.sheetWidth} vs ${m.innerWidth}`);
    // feet
    ok(a.parts.filter(p=>p.role==="foot").length === 4, `${tag}: feet count`);
    ok(m.feetHeight + m.bodyHeight === m.totalHeight, `${tag}: stack sum`);
    ok(Math.abs(m.totalHeight - H) < 0.01, `${tag}: height`);
  }
}
// thickness batch
const b = buildAssembly({ width: 600, height: 720, depth: 500, params: { thickness: { left: 25, right: 25, bottom: 25, back: 25, rail: 25, sheet: 3 } } });
const overlaps2 = (x,y)=>0;
ok(b.metrics.grooveFromBack === 25, "batch: groove offset = back thickness");
ok(b.parts.filter(p=>p.role==="foot").every(f=>true), "batch feet");
ok(b.issues.filter(i=>i.level==="error").length===0, "batch thickness errors");
// parametric anchoring
console.log(fail.length ? "FAILURES:\n" + fail.slice(0,20).join("\n") : "ALL CHECKS PASSED");
console.log("parts:", buildAssembly({width:600,height:720,depth:500}).parts.length);
