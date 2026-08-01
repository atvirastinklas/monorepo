import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSearchUrl, parseSearchResponse } from "@/lib/server/geocode/nominatim";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  q: z
    .string()
    .trim()
    .min(3)
    .max(128)
    .refine((value) =>
      Array.from(value).every((character) => {
        const codePoint = character.codePointAt(0);
        return codePoint !== undefined && codePoint >= 32 && codePoint !== 127;
      }),
    ),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Įveskite 3–128 simbolių vietovės pavadinimą." },
      { status: 400 },
    );
  }

  const { env } = getCloudflareContext();
  const upstream = await env.GEOCODE_COORDINATOR.get(
    env.GEOCODE_COORDINATOR.idFromName("nominatim"),
  ).fetch("https://geocode.internal/", {
    method: "POST",
    body: JSON.stringify({
      cacheKey: `search:v1:${parsed.data.q.normalize("NFC").toLocaleLowerCase("lt-LT")}`,
      upstreamUrl: createSearchUrl(parsed.data.q),
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

  const data = parseSearchResponse(payload.data);
  return NextResponse.json({
    data,
    meta: { count: data.length, cached: Boolean(payload.meta?.cached) },
  });
}
