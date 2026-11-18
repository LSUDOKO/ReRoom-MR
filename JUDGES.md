# ReRoom MR · evidence for judges

Every claim below links to the code that implements it and a way to check it yourself. Where something is not verified yet, it says so.

**Live:** https://reroom-mr.adoranto737.workers.dev/xr · **Track:** Productivity · **Division:** New Experience · **Device:** Meta Quest 3 / 3S, Quest Browser (WebXR)

## Executive summary

ReRoom MR lets you furnish your real room on Meta Quest with your hands, seated. A tray of real-size furniture floats at your lap; pinch a card and the piece stands on your floor through passthrough; pinch-drag it into place, turn it, open its doors and drawers, and restyle the room in one pinch. In VR you furnish a real living room generated with Aholo World. Every 3D asset was generated with Aholo (Lux3D and World) and is served from the same origin, so a cold start is one page load and one tap.

## Claims and how to verify them

| # | Claim | Where it lives | How to verify |
|---|---|---|---|
| 1 | Fully usable with hands, end to end; controllers never required | `src/components/xr/MRRoom.tsx` (`createXRStore` with `primaryInputMode: "hand"`, hand ray / touch / grab pointers) | `node scripts/xr-demo.mjs http://localhost:3200 tmp/xr` drives emulated Quest 3 hands through place, select, drag, rotate, open, style, remove and logs piece counts per step |
| 2 | Actions fire on pinch-down, so release drift never loses a press | `Button` and `TrayCard` in `MRRoom.tsx` use `onPointerDown` | Emulator run: every tray pinch adds exactly one piece (`pieces n -> n+1` in the log) |
| 3 | Pinch-drag follows where the hand ray meets the floor | `floorPoint()` in `src/lib/xr.ts`, used by `PieceModel` with pointer capture | `pnpm test` (floor-intersection cases); emulator log shows the wardrobe's controls move from x 0.06 to 0.57 after the drag |
| 4 | Rays far above the horizon or past 6 m never fling furniture | `floorPoint()` returns `null` for upward, parallel or > 6 m hits | `pnpm test` |
| 5 | Floating controls clear the lap tray's line of sight | `controlsHeight()` in `src/lib/xr.ts` | `pnpm test`; this fixed a bug where aiming at a control placed tray furniture (see `CHANGELOG.md`) |
| 6 | Furniture is shown at true size | `fit()` in `MRRoom.tsx` scales each GLB to its catalogue dimensions (`content/library.json`); rugs by their longest side | `pnpm test` covers `scaleFor` / `scaledDims` |
| 7 | Doors and drawers open on real joints | `useUrdf()` rebuilds URDF revolute and prismatic joints as pivots; `jointTarget()` picks the open limit | Open the wardrobe in the emulator (`tmp/xr/*-wardrobe-open.png`); `pnpm test` covers `jointTarget` |
| 8 | One pinch restyles every piece | Pre-baked variants in `content/manifest.json` (`variants`), swapped in `PieceModel` | Emulator screenshots `*-style-*.png` |
| 9 | VR places furniture in a real room generated with Aholo World | `RoomPanorama` in `MRRoom.tsx` (ground-projected `GroundedSkybox`, floor at y = 0) | `node scripts/xr-demo.mjs http://localhost:3200 tmp/vr --vr` |
| 10 | Seated: tray within reach, furniture lands ahead | Tray at `[0, 0.95, -0.55]` tilted toward you; `spawnSlot()` puts pieces 2.1 m ahead in rows | `pnpm test` (`spawnSlot`); emulator runs at a seated 1.25 m head height |
| 11 | No install, no account, fast cold start | Single route `/xr`, same-origin assets on Cloudflare Workers | Open the live URL; `curl -I https://reroom-mr.adoranto737.workers.dev/library/L_SOFA_3.glb` |

## What is not verified yet

- **Physical Quest 3.** Everything was built and tested in Meta's IWER emulator, not on a headset.
- **Controllers.** Enabled in the store but not exercised by the test.
- **Plane detection / hit-test.** Pieces land on y = 0 of the local-floor space; they don't snap to detected surfaces yet.

## Media

- Film (3:02): `~/Videos/ReRoom-MR-film.mp4`, uploaded with the submission
- Screenshots: `docs/` and https://reroom-mr.adoranto737.workers.dev/devpost/
- Architecture: `docs/architecture.png`, detail in `ARCHITECTURE.md`
