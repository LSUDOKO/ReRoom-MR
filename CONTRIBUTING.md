# Contributing

1. `pnpm install`, then `pnpm dev --port 3200` and open http://localhost:3200/xr (the Quest 3 emulator runs on localhost).
2. Keep XR logic that can be pure in `src/lib/xr.ts` and add a check to `scripts/selfcheck.mts`.
3. Before a PR: `pnpm lint`, `pnpm test`, and `node scripts/xr-demo.mjs http://localhost:3200 tmp/xr`.
4. Never commit `.env*` files or keys.
