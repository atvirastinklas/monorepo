import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createReverseUrl, parseReverseResponse } from "@/lib/server/geocode/nominatim";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  latitude: z.number().finite().min(53).max(57),
  longitude: z.number().finite().min(19).max(28),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Neteisingos koordinatės." }, { status: 400 });
  }

  const { latitude, longitude } = parsed.data;
  const { env } = getCloudflareContext();
  const upstream = await env.GEOCODE_COORDINATOR.get(
    env.GEOCODE_COORDINATOR.idFromName("nominatim"),
  ).fetch("https://geocode.internal/", {
    method: "POST",
    body: JSON.stringify({
      cacheKey: `reverse:v2:${latitude.toFixed(5)}:${longitude.toFixed(5)}`,
      upstreamUrl: createReverseUrl(latitude, longitude),
    }),
  });

  const payload = (await upstream.json()) as {
    data?: unknown;
    error?: string;
    meta?: { cached?: boolean };
  };
  if (!upstream.ok) {
    return NextResponse.json(
      { error: payload.error ?? "Geocoding service is unavailable." },
      {
        status: upstream.status,
        headers: upstream.headers.get("Retry-After") ? { "Retry-After": "2" } : undefined,
      },
    );
  }

  const data = parseReverseResponse(payload.data);
  return NextResponse.json({ data, meta: { cached: Boolean(payload.meta?.cached) } });
}
