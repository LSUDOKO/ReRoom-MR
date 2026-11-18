# Changelog

## 0.2.0 · 19 Nov 2026 · ReRoom MR for Meta Quest
- Hands-first mixed reality at `/xr`: hand tray, pinch to place, pinch-drag, rotate, open doors and drawers, room styles, remove.
- VR mode inside a real living room generated with Aholo World, ground-projected.
- Fix: actions fire on pinch-down (release drift lost clicks).
- Fix: drag uses pointer capture and a ray–floor intersection (the held piece blocked its own ray).
- Fix: floating controls sit above the tray's line of sight (rays aimed at them hit tray cards).
- Fix: one three.js version across the tree (the emulator's synthetic environment crashed materials).
- XR maths moved to `src/lib/xr.ts` with unit tests; emulator end-to-end script `scripts/xr-demo.mjs`.
- CI: lint and tests on every push.

## 0.1.0 · 18 Nov 2026
- ReRoom web studio: scan, remix and restyle rooms with Aholo Lux3D and World.
