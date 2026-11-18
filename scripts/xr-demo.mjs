// Drives ReRoom MR in Meta's IWER emulator (Quest 3, hand tracking, synthetic living room) and
// records it: enters mixed reality, then the right hand points and pinches at named targets.
//   node scripts/xr-demo.mjs [baseUrl] [outDir] [--video]
// Needs the dev server (the emulator only injects on localhost).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3200";
const out = process.argv[3] ?? "tmp/xr";
const video = process.argv.includes("--video");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-gpu"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...(video ? { recordVideo: { dir: out, size: { width: 1280, height: 720 } } } : {}) });
// headless Chromium reports a native WebXR runtime it can't actually start; report none, so the
// app installs Meta's IWER Quest 3 emulator (what a desktop browser without a headset gets)
await ctx.addInitScript(() => {
  delete Navigator.prototype.xr;
});
const page = await ctx.newPage();
const t0 = Date.now(); // the recorded video starts with the page
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); if (m.text().startsWith("XRDBG")) console.log(m.text()); });
await page.goto(base + "/xr");
await page.waitForTimeout(5000);
// enter, retrying until the emulated session is live (the first tap can land before the emulator is ready)
for (let i = 0; i < 6 && !(await page.evaluate(() => !!window.__xrStore?.getState().session)); i++) {
  await page.getByRole("button", { name: process.argv.includes("--vr") ? "Enter VR" : "Enter mixed reality" }).click().catch(() => {});
  await page.waitForTimeout(3000);
}
await page.waitForTimeout(3000);

let shot = 0;
const marks = [];
const mark = (label) => marks.push({ label, t: (Date.now() - t0) / 1000 });
const snap = async (name) => (mark(name), page.screenshot({ path: `${out}/${String(++shot).padStart(2, "0")}-${name}.png` }));

// world position of a named object, and an emulated hand that points at it and pinches
const where = (name) =>
  page.evaluate((name) => {
    const o = window.__xrScene?.getObjectByName(name);
    if (!o) return null;
    o.updateWorldMatrix(true, true);
    if (name.startsWith("piece:")) {
      const box = new window.__xrBox3().setFromObject(o);
      return [(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2];
    }
    const e = o.matrixWorld.elements;
    return [e[12], e[13], e[14]];
  }, name);

// The emulator's devui owns the hand poses (it copies its transform gizmos onto the device every
// frame), so the right hand is moved through the gizmo it exposes as window.transformHandles.
async function pointAt(t, hand = "right") {
  await page.evaluate(
    ({ t, hand }) => {
      const h = window.transformHandles.get(hand);
      // seated: the hand rests in front of the chest and only aims, it never reaches into the room
      const world = { x: 0.17, y: t[1] > 1.2 ? 1.16 : 1.0, z: -0.26 }; // raise the hand for anything above the tray
      const local = h.parent.worldToLocal(h.position.clone().set(world.x, world.y, world.z));
      h.position.copy(local);
      h.updateMatrixWorld(true);
      // Object3D.lookAt aims +Z; a hand's ray is -Z, so look away from the target
      h.lookAt(2 * world.x - t[0], 2 * world.y - t[1], 2 * world.z - t[2]);
    },
    { t, hand },
  );
  await page.waitForTimeout(450);
}
async function pinch(hand = "right", hold = 600) {
  const set = (v) => page.evaluate(({ hand, v }) => window.__xrStore.getState().emulator.hands[hand].updatePinchValue(v), { hand, v });
  await set(1);
  await page.waitForTimeout(hold);
  await set(0);
  await page.waitForTimeout(500);
}

async function press(name) {
  const t = await where(name);
  if (!t) return errors.push(`target not found: ${name}`);
  const count = () => page.evaluate(() => { let n = 0; window.__xrScene.traverse((o) => o.name.startsWith("piece:") && n++); return n; });
  const before = await count();
  await pointAt(t);
  await pinch();
  console.log(name, t.map((v) => v.toFixed(2)).join(","), "pieces", before, "->", await count());
}

// pinch a piece and keep pinching while the hand sweeps its ray across the floor, then let go
async function drag(name, to) {
  const t = await where(name);
  if (!t) return errors.push(`target not found: ${name}`);
  await pointAt(t);
  const set = (v) => page.evaluate((v) => window.__xrStore.getState().emulator.hands.right.updatePinchValue(v), v);
  await set(1);
  await page.waitForTimeout(500);
  for (let i = 1; i <= 24; i++) {
    const k = i / 24;
    await pointAt([t[0] + (to[0] - t[0]) * k, 0, t[2] + (to[1] - t[2]) * k].map((v, j) => (j === 1 ? 0.02 : v)));
  }
  await set(0);
  await page.waitForTimeout(600);
}

// the left hand rests out of view; this is a one-handed, seated experience
await page.evaluate(() => {
  const h = window.transformHandles.get("left");
  h.position.y -= 0.8;
  h.position.x -= 0.4;
});
await page.waitForTimeout(1500);
const turn = async (n) => { for (let i = 0; i < n; i++) { await press("btn:⟲ 15°"); await page.waitForTimeout(250); } };
if (process.argv.includes("--vr")) {
  // furnish the empty Aholo living room the way a person would: rug, then a sofa against the left
  // wall facing the TV, a coffee table in front, an armchair, a plant in the corner, drawers by the window
  await snap("entered");
  const place = async (id, to, turns = 0) => {
    mark(`place ${id}`);
    await press(`tray:${id}`);
    await page.waitForTimeout(1400);
    await drag(`piece:${id}`, to);
    await page.waitForTimeout(500);
    if (turns) await turn(turns);
    await page.waitForTimeout(700);
  };
  await place("L_RUG_ROUND", [0.05, -2.5]);
  await place("L_SOFA_3", [-0.95, -2.5], 6);
  await snap("sofa");
  await place("L_COFFEE", [0.0, -2.5], 6);
  await place("L_ARMCHAIR", [0.75, -3.3]);
  await place("L_PLANT_BIG", [-1.0, -3.7]);
  await place("L_DRAWERS", [0.95, -1.9]);
  await snap("furnished");
  mark("open");
  await press("btn:Open");
  await page.waitForTimeout(2600);
  await snap("drawers-open");
  await press("btn:Close");
  await page.waitForTimeout(1200);
  for (const s of ["Japandi", "Industrial", "Cyberpunk"]) {
    await press(`btn:${s}`);
    await page.waitForTimeout(3200);
    await snap(`style-${s.toLowerCase()}`);
  }
  await press("btn:Japandi");
  await page.waitForTimeout(3500);
  await snap("final");
} else {
await page.waitForTimeout(1500);
await snap("entered");
for (const id of ["L_ARMCHAIR", "L_WARDROBE", "L_PLANT_BIG"]) {
  await press(`tray:${id}`);
  await page.waitForTimeout(1800);
}
await snap("placed");
await press("piece:L_WARDROBE");
await page.waitForTimeout(800);
await drag("piece:L_WARDROBE", [0.5, -2.6]);
await page.waitForTimeout(800);
await snap("wardrobe-moved");
await press("btn:Open");
await page.waitForTimeout(2200);
await snap("wardrobe-open");
await press("btn:⟳ 15°");
await page.waitForTimeout(500);
await press("btn:⟳ 15°");
await page.waitForTimeout(900);
for (const s of ["Japandi", "Industrial", "Cyberpunk"]) {
  await press(`btn:${s}`);
  await page.waitForTimeout(2600);
  await snap(`style-${s.toLowerCase()}`);
}
await press("btn:Original");
await page.waitForTimeout(1500);
await press("piece:L_PLANT_BIG");
await page.waitForTimeout(600);
await press("btn:Remove");
await page.waitForTimeout(1500);
await snap("removed");
}
const placed = await page.evaluate(() => {
  const names = [];
  window.__xrScene.traverse((o) => o.name.startsWith("piece:") && names.push(o.name));
  return names;
});
console.log("MARKS " + JSON.stringify(marks));
console.log(JSON.stringify({ placed, session: await page.evaluate(() => window.__xrStore.getState().mode), errors: errors.slice(0, 8) }));
await ctx.close();
await browser.close();
