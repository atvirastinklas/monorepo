import { DurableObject } from "cloudflare:workers";
import type { DurableObjectState } from "@cloudflare/workers-types";

const minimumUpstreamIntervalMs = 1_100;
const cacheTtlMs = 1000 * 60 * 60 * 24 * 30;

type CoordinatorRequest = {
  cacheKey: string;
  upstreamUrl: string;
};

type CachedResponse = {
  expiresAt: number;
  body: unknown;
};

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class GeocodeCoordinator extends DurableObject<CloudflareEnv> {
  constructor(
    private readonly state: DurableObjectState,
    env: CloudflareEnv,
  ) {
    super(state, env);
  }

  async fetch(request: Request) {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body: CoordinatorRequest;
    try {
      body = (await request.json()) as CoordinatorRequest;
    } catch {
      return Response.json({ error: "Invalid geocoding request" }, { status: 400 });
    }

    if (!body.cacheKey || !body.upstreamUrl.startsWith("https://nominatim.openstreetmap.org/")) {
      return Response.json({ error: "Invalid geocoding request" }, { status: 400 });
    }

    const cacheKey = `geocode:${await digest(body.cacheKey)}`;
    const now = Date.now();
    const cached = await this.state.storage.get<CachedResponse>(cacheKey);
    if (cached && cached.expiresAt > now) {
      return Response.json({ data: cached.body, meta: { cached: true } });
    }

    const accepted = await this.state.storage.transaction(async (storage) => {
      const nextRequestAt = (await storage.get<number>("nextRequestAt")) ?? 0;
      if (Date.now() < nextRequestAt) {
        return false;
      }

      await storage.put("nextRequestAt", Date.now() + minimumUpstreamIntervalMs);
      return true;
    });

    if (!accepted) {
      return Response.json(
        { error: "Geocoding service is busy. Try again in a moment." },
        { status: 429, headers: { "Retry-After": "2" } },
      );
    }

    let upstream: Response;
    try {
      upstream = await fetch(body.upstreamUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "AtvirasTinklas naming helper (+https://atvirastinklas.lt)",
        },
      });
    } catch {
      return Response.json({ error: "Geocoding service is unavailable." }, { status: 503 });
    }

    if (!upstream.ok) {
      return Response.json({ error: "Geocoding service is unavailable." }, { status: 502 });
    }

    let upstreamBody: unknown;
    try {
      upstreamBody = await upstream.json();
    } catch {
      return Response.json(
        { error: "Geocoding service returned an invalid response." },
        { status: 502 },
      );
    }

    await this.state.storage.put(cacheKey, { body: upstreamBody, expiresAt: now + cacheTtlMs });
    return Response.json({ data: upstreamBody, meta: { cached: false } });
  }
}
