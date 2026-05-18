import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";

import { isMeshcoreIataRegion } from "@/lib/meshcore/regions";
import { listMeshcoreRepeaters } from "@/lib/server/meshcore/repeaters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const iata = request.nextUrl.searchParams.get("iata");

  if (iata !== null && !isMeshcoreIataRegion(iata)) {
    return NextResponse.json(
      {
        error: "Unsupported IATA region",
      },
      { status: 400 },
    );
  }

  const { env } = getCloudflareContext();
  const result = await listMeshcoreRepeaters(env.DB, {
    iata: iata ?? undefined,
  });

  return NextResponse.json({
    data: result.repeaters,
    meta: {
      count: result.repeaters.length,
      iata,
      recordedAtMax: result.recordedAtMax,
    },
  });
}
