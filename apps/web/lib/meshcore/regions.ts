export const MESHCORE_IATA_REGIONS = ["VNO", "KUN", "SQQ", "PLQ"] as const;

export type MeshcoreIataRegion = (typeof MESHCORE_IATA_REGIONS)[number];

export function isMeshcoreIataRegion(value: string): value is MeshcoreIataRegion {
  return MESHCORE_IATA_REGIONS.includes(value as MeshcoreIataRegion);
}
