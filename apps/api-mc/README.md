# MeshCore repeater API

Cloudflare Worker for `api-mc.atvirastinklas.lt`. It crawls the Beacon node API
every 15 minutes by default, stores domestic Lithuanian repeaters in D1, and
provides a compact public dataset. CoreScope remains an optional fallback.

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

Copy the returned `database_id` to the `MESHCORE_DB` binding in
`wrangler.jsonc`, then apply the schema and configure the manual-sync secret:

```sh
pnpm --filter api-mc run db:migrations:apply:remote
pnpm --filter api-mc exec wrangler secret put SYNC_API_KEY
pnpm --filter api-mc run deploy
```

The custom-domain route in `wrangler.jsonc` requires the
`atvirastinklas.lt` zone to be active in the target Cloudflare account.

## Topology provider

The Worker uses Beacon by default:

```json
{
  "MESHCORE_PROVIDER": "beacon",
  "BEACON_BASE_URL": "https://beacon.atvirastinklas.lt",
  "CORESCOPE_BASE_URL": "https://meshcore.atvirastinklas.lt"
}
```

`MESHCORE_PROVIDER` accepts only `beacon` and `corescope`; an unset value also
uses `beacon`. To switch to the CoreScope fallback, set
`MESHCORE_PROVIDER` to `corescope` in the Worker variables and deploy. Beacon
uses `/api/v1/nodes` with cursor pagination and neighbor UUID resolution.
CoreScope retains its `/api/nodes` and neighbor-graph synchronization flow.

## Run a sync manually

The scheduled trigger is not required to synchronize repeaters. Create a
high-entropy secret locally, save it as the Worker's `SYNC_API_KEY` secret,
then call the protected endpoint.

```sh
# Generate a token. Keep it secret; do not commit or paste it into logs.
SYNC_API_KEY="$(openssl rand -hex 32)"

# Save the token in Cloudflare. Wrangler prompts for its value.
pnpm --filter api-mc exec wrangler secret put SYNC_API_KEY
```

When prompted, paste the generated value. Alternatively, use the Cloudflare
dashboard: **Workers & Pages → api-mc → Settings → Variables and Secrets → Add
secret**, with the name `SYNC_API_KEY`.

Call the endpoint directly from a shell with the same token:

```sh
curl --fail-with-body --silent --show-error \
  --request POST "https://api-mc.atvirastinklas.lt/v1/repeaters/sync" \
  --header "Authorization: Bearer $SYNC_API_KEY"
```

The response is JSON describing the completed synchronization. A `401` means
the token is missing or does not match the deployed `SYNC_API_KEY`; a `500`
means the synchronization itself failed—inspect the `api-mc` Worker logs for
the error.

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

Use `http://localhost:8701/__scheduled` to exercise the scheduled handler.
Run `pnpm --filter api-mc run check` before deployment.
