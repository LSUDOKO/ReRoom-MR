# Deployment

Live: https://reroom-mr.adoranto737.workers.dev/xr (Cloudflare Worker `reroom-mr`).

```bash
npx wrangler login
pnpm cf:deploy        # next build via OpenNext, then wrangler deploy
```

The Quest experience needs no secrets. The web studio's live generation needs `AHOLO_API_KEY` as a Worker secret (`npx wrangler secret put AHOLO_API_KEY`); without it the studio runs on its pre-generated library.

| Setting | Where | Purpose |
|---|---|---|
| `SITE_URL` | `package.json` `cf:build`, `wrangler.jsonc` | Public origin for OpenGraph URLs |
| `REROOM_BUDGET` KV | `wrangler.jsonc` | Daily generation budget (web studio) |
| `RL_*` rate limits | `wrangler.jsonc` | Per-IP and global limits (web studio) |

Media for the Devpost page is served from `public/devpost/`.
