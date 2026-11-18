# Security

This is an internal review by the author, not an independent audit. There are no smart contracts or wallets in this project.

## Threat model

| Asset | Risk | Protection |
|---|---|---|
| Aholo API key (web studio only) | Leak through the client bundle or repo | Server-only env var; `.env*` git-ignored; `scripts/cf-strip-env.mjs` strips `.env.local` values from the Worker bundle; key stored as a Worker secret |
| Aholo credits | Abuse of generation routes | Per-IP and site-wide rate-limit bindings plus a daily task budget in KV (`src/lib/guard.ts`, `wrangler.jsonc`) |
| `/api/proxy` | SSRF | Host allowlist, HTTPS only (`proxyAllowed`, tested in `pnpm test`) |
| Prompts | Disallowed or trademarked content sent to generation | `checkPrompt` (tested) |
| Quest experience `/xr` | — | Static, client-only; makes no API calls and holds no user data |

## The XR flow

`/xr` loads only same-origin static assets. No camera frames, passthrough images or hand data leave the device: WebXR exposes poses to the page, and the page only uses them to drive pointers. The IWER emulator is injected only when the hostname is `localhost`.

## Checks run

- `pnpm test`: prompt guard, SSRF allowlist, output picking, sizing, share links, XR maths.
- `pnpm lint`: ESLint, 0 errors.
- Secrets: repo searched for keys before publishing; none committed.

## Known limits

- No independent security audit.
- Rate limits are per isolate plus KV budget; a determined attacker could still spend some credits before limits trip.
