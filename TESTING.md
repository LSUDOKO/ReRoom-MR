# Testing

| Layer | Command | What it checks |
|---|---|---|
| Unit | `pnpm test` | `scripts/selfcheck.mts`: prompt guard, SSRF allowlist, Lux3D output picking, sizing, share-link round trip, and the XR maths in `src/lib/xr.ts` (floor intersection and its rejection cases, spawn slots, joint targets, control height) |
| Lint | `pnpm lint` | ESLint over the app |
| End to end, MR | `node scripts/xr-demo.mjs http://localhost:3200 tmp/xr` | Meta's IWER emulator (Quest 3, hands, synthetic living room). Drives the right hand from a seated pose and checks: tray pinch places a piece, select, pinch-drag moves it, rotate, open, all styles, remove |
| End to end, VR | `node scripts/xr-demo.mjs http://localhost:3200 tmp/vr --vr` | The same hands furnish the Aholo living room step by step; prints a timestamp per step |
| Recording | add `--video` | Saves a `.webm` of the run |

Run the dev server first: `pnpm dev --port 3200`. The emulator only injects on `localhost`.

## Latest results (19 Nov 2026)

- `pnpm test`: all passed. A deliberately broken assertion fails the suite, so the checks really run.
- `pnpm lint`: 0 errors.
- Emulator MR run: 3 pieces placed, drag moved the wardrobe, doors opened, styles applied, a piece removed, no console errors.

Not yet tested on a physical Quest.
