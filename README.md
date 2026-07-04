# shadcn/ui monorepo template

This template is for creating a monorepo with shadcn/ui.

## Usage

```bash
pnpm dlx shadcn@latest init
```

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Tailwind

Your `tailwind.config.ts` and `globals.css` are already set up to use the components from the `ui` package.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Running `apps/web` locally with Cloudflare bindings

The web app runs on Cloudflare Workers via OpenNext, using a D1 database (`DB` binding) for MeshCore repeater data. Use two local loops depending on what you're doing:

- `pnpm --filter web dev` — daily development. Runs `next dev --turbopack` with hot reload. `initOpenNextCloudflareForDev()` (in [`apps/web/next.config.mjs`](apps/web/next.config.mjs)) makes local Cloudflare bindings (like D1) available to `getCloudflareContext()` while using Next's own dev server.
- `pnpm --filter web preview` — production-like runtime check. Builds with `opennextjs-cloudflare build` and serves the result through Wrangler/`workerd`. Use this before deploying, or whenever you touch the Worker entrypoint, D1 access, or caching.
- `pnpm --filter web preview:scheduled` — same as `preview`, but also exposes the `/__scheduled` route so the cron-triggered MeshCore sync handler in [`apps/web/worker.ts`](apps/web/worker.ts) can be tested locally.
- `pnpm --filter web deploy` — production deploy.

### First-time local setup

```bash
nvm use
pnpm install
pnpm --filter web db:schema:local
pnpm --filter web dev
```

`db:schema:local` applies [`apps/web/migrations/0001_meshcore_repeaters.sql`](apps/web/migrations/0001_meshcore_repeaters.sql) to Wrangler's **local** D1 state (via `--local`), so nothing touches the remote/production database. Local D1 data lives under Wrangler's local state directory, which is already ignored via `.wrangler` in [`.gitignore`](.gitignore).

After applying the schema, D1-backed routes (e.g. `GET /api/meshcore/retransliatoriai`, or docs pages rendering `MeshcoreRepeatersList`) should load with an empty result set instead of erroring.

### Populating local MeshCore data

The MeshCore repeater sync only runs through the Worker's scheduled handler, not an HTTP route, so trigger it locally with Wrangler's scheduled-test endpoint:

```bash
pnpm --filter web preview:scheduled
# in another terminal:
curl "http://localhost:8787/__scheduled?cron=*/30+*+*+*+*"
pnpm --filter web db:count:local
```

### Other useful commands

```bash
# Regenerate Cloudflare binding types after changing wrangler.jsonc
pnpm --filter web cf-typegen

# Run the web app against Cloudflare Workers runtime locally
nvm use
pnpm --filter web preview

# Deploy the web app to Cloudflare Workers
nvm use
pnpm --filter web deploy
```
