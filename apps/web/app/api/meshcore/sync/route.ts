import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";

import { runMeshcoreRepeaterSyncJob } from "@/lib/server/meshcore/repeaters";

export const dynamic = "force-dynamic";

function isSyncAuthorized(request: NextRequest, secret: string | undefined) {
  if (secret) {
    const authorization = request.headers.get("authorization");
    return authorization === `Bearer ${secret}`;
  }

  return process.env.NODE_ENV === "development";
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  if (!isSyncAuthorized(request, env.MESHCORE_SYNC_SECRET)) {
    if (!env.MESHCORE_SYNC_SECRET) {
      return NextResponse.json(
        {
          error: "MeshCore sync secret is not configured",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const outcome = await runMeshcoreRepeaterSyncJob(env.DB);

  if (!outcome.ok) {
    return NextResponse.json(
      {
        error: "MeshCore repeater sync failed",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: outcome.result,
  });
}
