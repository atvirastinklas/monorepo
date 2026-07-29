# MeshCore repeater API

Cloudflare Worker for `api-mc.atvirastinklas.lt`. It crawls the CoreScope node
and neighbor-graph APIs every 15 minutes, stores domestic Lithuanian repeaters
in D1, and provides a compact public dataset.

## Public routes

- `GET /v1/repeaters/stats` returns `{ total, regions }`.
- `GET /v1/repeaters` returns `[{ id, lat, lon, name, neighbors }]`. `id` and
  `neighbors` are six-character public-key prefixes for display only; they are
  not guaranteed unique.
- `POST /v1/repeaters/sync` runs an immediate crawl. Send
  `Authorization: Bearer <SYNC_API_KEY>`.

The repeater list returns strong `ETag` and `Last-Modified` headers and is
cached for 15 minutes. The Worker accepts `If-None-Match` and
`If-Modified-Since`.

## Initial deployment

Wrangler automatically provisions the configured D1 binding on first deploy.
For a database in the EU, create it explicitly instead:

```sh
pnpm --filter api-mc exec wrangler d1 create api-mc --jurisdiction eu
```

Copy the returned `database_id` into `wrangler.jsonc`, then apply the schema
and configure the manual-sync secret:

```sh
pnpm --filter api-mc run db:migrations:apply:remote
pnpm --filter api-mc exec wrangler secret put SYNC_API_KEY
pnpm --filter api-mc run deploy
```

The custom-domain route in `wrangler.jsonc` requires the
`atvirastinklas.lt` zone to be active in the target Cloudflare account.

## Local development

Create an uncommitted `.dev.vars`:

```dotenv
SYNC_API_KEY=replace-with-a-local-secret
```

Then apply local migrations and run the Worker:

```sh
pnpm --filter api-mc run db:migrations:apply:local
pnpm --filter api-mc run dev
```

Use `http://localhost:8787/__scheduled` to exercise the scheduled handler.
Run `pnpm --filter api-mc run check` before deployment.
