import { getCloudflareContext } from "@opennextjs/cloudflare";
import { unstable_noStore as noStore } from "next/cache";

import { listMeshcoreRepeaters } from "@/lib/server/meshcore/repeaters";

import { MeshcoreRepeatersClient, type MeshcoreRepeaterListItem } from "./repeaters-list-client";

export async function MeshcoreRepeatersList() {
  noStore();

  const { env } = getCloudflareContext();
  const result = await listMeshcoreRepeaters(env.DB);
  const repeaters = result.repeaters.map(
    (repeater): MeshcoreRepeaterListItem => ({
      iata: repeater.iata,
      id: repeater.id,
      hexId: repeater.hex_id,
      name: repeater.name,
      lat: repeater.lat,
      lon: repeater.lon,
      lastHeard: repeater.last_heard,
      enabled: repeater.enabled === 1,
      hopBytes: repeater.hop_bytes,
      recordedAt: repeater.recorded_at,
    }),
  );

  return <MeshcoreRepeatersClient repeaters={repeaters} recordedAtMax={result.recordedAtMax} />;
}
