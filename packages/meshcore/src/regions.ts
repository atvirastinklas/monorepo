import bboxPolygon from "@turf/bbox-polygon";
import booleanIntersects from "@turf/boolean-intersects";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import meshcoreRegionsGeoJson from "./assets/lithuania.json";

export const MESHCORE_IATA_REGIONS = ["VNO", "KUN", "SQQ", "PLQ"] as const;

export type MeshcoreIataRegion = (typeof MESHCORE_IATA_REGIONS)[number];

type Position = [number, number, ...number[]];
type LinearRing = Position[];
type PolygonCoordinates = LinearRing[];
type MultiPolygonCoordinates = PolygonCoordinates[];

type Geometry =
  | { type: "Point"; coordinates: Position }
  | { type: "Polygon"; coordinates: PolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };

type Feature = {
  type: "Feature";
  geometry: Geometry | null;
  properties: Record<string, unknown> | null;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

type RegionFeature = {
  iata: MeshcoreIataRegion;
  feature: Feature & { geometry: Exclude<Geometry, { type: "Point" }> };
  bounds: ReturnType<typeof bboxPolygon>;
};

const regionFeatures = extractRegionFeatures(
  meshcoreRegionsGeoJson as unknown as FeatureCollection,
);

export function isMeshcoreIataRegion(value: string): value is MeshcoreIataRegion {
  return MESHCORE_IATA_REGIONS.includes(value as MeshcoreIataRegion);
}

export function findMeshcoreIataRegion(
  longitude: number | null | undefined,
  latitude: number | null | undefined,
): MeshcoreIataRegion | null {
  if (
    longitude === null ||
    longitude === undefined ||
    latitude === null ||
    latitude === undefined ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null;
  }

  const point = {
    coordinates: [longitude, latitude] as [number, number],
    type: "Point" as const,
  };

  for (const region of regionFeatures) {
    if (!booleanIntersects(point, region.bounds)) {
      continue;
    }

    if (booleanPointInPolygon(point, region.feature)) {
      return region.iata;
    }
  }

  return null;
}

function extractRegionFeatures(source: FeatureCollection): RegionFeature[] {
  const regions: RegionFeature[] = [];

  for (const feature of source.features) {
    const iataCode = feature.properties?.iata_code;

    if (
      feature.geometry === null ||
      feature.geometry.type === "Point" ||
      typeof iataCode !== "string" ||
      !isMeshcoreIataRegion(iataCode)
    ) {
      continue;
    }

    const boundaryFeature = feature as RegionFeature["feature"];
    regions.push({
      iata: iataCode,
      feature: boundaryFeature,
      bounds: bboxPolygon(calculateBounds(boundaryFeature.geometry)),
    });
  }

  const missing = MESHCORE_IATA_REGIONS.filter(
    (iata) => !regions.some((region) => region.iata === iata),
  );
  if (missing.length > 0) {
    throw new Error(`Missing MeshCore region polygons: ${missing.join(", ")}`);
  }

  return regions;
}

function calculateBounds(
  geometry: Exclude<Geometry, { type: "Point" }>,
): [number, number, number, number] {
  const bounds = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        bounds[0] = Math.min(bounds[0] ?? Number.POSITIVE_INFINITY, longitude);
        bounds[1] = Math.min(bounds[1] ?? Number.POSITIVE_INFINITY, latitude);
        bounds[2] = Math.max(bounds[2] ?? Number.NEGATIVE_INFINITY, longitude);
        bounds[3] = Math.max(bounds[3] ?? Number.NEGATIVE_INFINITY, latitude);
      }
    }
  }

  if (!bounds.every(Number.isFinite)) {
    throw new Error("MeshCore region polygon contains no finite coordinates");
  }

  return bounds as [number, number, number, number];
}
