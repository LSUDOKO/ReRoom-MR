// Runnable checks for the logic that guards money, security and data: `pnpm test`.
import assert from "node:assert/strict";
import { checkPrompt, proxyAllowed } from "../src/lib/guard.ts";
import { pickUrl } from "../src/lib/aholo/server.ts";
import { decodeDesign, encodeDesign } from "../src/lib/share.ts";
import { scaleFor, scaledDims } from "../src/lib/store.ts";
import { guessCategory } from "../src/lib/catalog.ts";
import { controlsHeight, floorPoint, jointTarget, spawnSlot } from "../src/lib/xr.ts";

// prompt guard
assert.equal(checkPrompt("a gun cabinet").ok, false);
assert.equal(checkPrompt("hi").ok, false);
const p = checkPrompt("an IKEA style   bookshelf");
assert.ok(p.ok && p.prompt === "an flat-pack style bookshelf" && p.note);

// SSRF allowlist for /api/proxy
assert.equal(proxyAllowed("https://qhsmodel.kujiale.com/a.glb"), true);
assert.equal(proxyAllowed("https://holo-cos.aholo3d.cn/x.spz"), true);
assert.equal(proxyAllowed("http://qhsmodel.kujiale.com/a.glb"), false);
assert.equal(proxyAllowed("https://kujiale.com.evil.io/a.glb"), false);
assert.equal(proxyAllowed("https://169.254.169.254/latest"), false);

// Lux3D outputs are positional; pick by extension, skip NOT_REQUESTED
assert.equal(pickUrl(["NOT_REQUESTED", "https://x/a.zip", "https://x/b.glb?sig=1"], "glb"), "https://x/b.glb?sig=1");
assert.equal(pickUrl(["https://x/a.zip"], "glb"), undefined);

// sizing: rugs scale by their longest side, everything else by height
assert.equal(scaleFor("seating", { w: 1, d: 1, h: 2 }, 1), 0.5);
assert.equal(scaleFor("textile", { w: 0.38, d: 0.38, h: 0.02 }, 1.9), 5);
assert.deepEqual(scaledDims({ w: 1, d: 0.5, h: 2 }, 1), { w: 0.5, d: 0.25, h: 1 });

assert.equal(guessCategory("a tall walnut wardrobe"), "storage");
assert.equal(guessCategory("round jute rug"), "textile");

// share link round-trip keeps placement and drops session-only blob URLs
const room = { id: "r", name: "Room", blurb: "", url: "/rooms/r.spz", source: "sample" as const, calibration: { up: "+z" as const, scale: 1, yaw: 0, offset: [0, 1, 0] as [number, number, number] } };
const item = {
  uid: "u", name: "Chair", category: "seating" as const, origin: "library" as const, status: "ready" as const, glb: "/library/L_ARMCHAIR.glb",
  urdf: { kind: "urdf" as const, base: "blob:x", files: { "meshes/a.glb": "blob:y" } },
  variants: { japandi: "/v.glb", industrial: "/w.glb" }, position: [1.23456, 0, -2] as [number, number, number], yaw: 0.5, height: 0.95, open: true,
};
const d = decodeDesign(encodeDesign(room, "japandi", [item]))!;
assert.equal(d.items.length, 1);
assert.deepEqual(d.items[0].position, [1.235, 0, -2]);
assert.equal(d.items[0].urdf, undefined);
assert.deepEqual(d.items[0].variants, { japandi: "/v.glb" });
assert.equal(d.items[0].open, false);
assert.equal(decodeDesign("garbage"), null);

// hero keyframes: every section (or its -stop marker) and anchor still exists on the landing page,
// so the 3D chair never loses its path after a redesign
{
  const { HERO_KEYFRAMES } = await import("../src/landing/heroKeyframes.ts");
  const { readFileSync } = await import("node:fs");
  const page = readFileSync("src/app/page.tsx", "utf8");
  for (const k of HERO_KEYFRAMES) {
    assert.ok(page.includes(`id="${k.section}"`) || page.includes(`id="${k.section}-stop"`), `missing section #${k.section}`);
    if (k.anchor) assert.ok(page.includes(`id="${k.anchor.slice(1)}"`), `missing anchor ${k.anchor}`);
  }
  assert.equal(new Set(HERO_KEYFRAMES.map((k) => k.section)).size, HERO_KEYFRAMES.length, "duplicate keyframe section");
}


// Quest: a seated hand at 1 m aiming 45° down hits the floor 1 m ahead
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const hit = floorPoint({ x: 0, y: 1, z: 0 }, { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 });
assert.ok(hit && near(hit[0], 0) && near(hit[1], -1));
// rays that never reach the floor, or reach it too far away, don't move the piece
assert.equal(floorPoint({ x: 0, y: 1, z: 0 }, { x: 0, y: 0.2, z: -1 }), null);
assert.equal(floorPoint({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }), null);
assert.equal(floorPoint({ x: 0, y: 1, z: 0 }, { x: 0, y: -0.1, z: -1 }), null);
// placement rows of three, 2.1 m ahead, then a row further back
assert.deepEqual(spawnSlot(0), { x: -1.1, z: -2.1 });
assert.ok(near(spawnSlot(2).x, 1.1) && spawnSlot(3).z < -2.9);
// joints open toward their larger limit; continuous joints swing a quarter turn
assert.equal(jointTarget("revolute", -1.57, 0), -1.57);
assert.equal(jointTarget("prismatic", 0, 0.35), 0.35);
assert.equal(jointTarget("continuous", 0, 0), Math.PI / 2);
// piece controls always clear the lap tray's line of sight
assert.equal(controlsHeight(0.4), 1.55);
assert.ok(near(controlsHeight(2.1), 2.35));
console.log("selfcheck: all passed");
