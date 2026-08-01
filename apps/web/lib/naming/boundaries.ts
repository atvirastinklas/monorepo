import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import type { NamingCode } from "./rules";

type PolygonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
};
type ScopeFeature = PolygonFeature & { properties: { display_name?: unknown } };

type ScopeCollection = {
  type: "FeatureCollection";
  features: ScopeFeature[];
};

type NamingAreaFeature = PolygonFeature & {
  properties: {
    display_name?: unknown;
    feature_type?: unknown;
    priority?: unknown;
    suggested_code?: unknown;
  };
};

type NamingAreaCollection = {
  type: "FeatureCollection";
  features: NamingAreaFeature[];
};

export type Coordinates = { latitude: number; longitude: number };

let scopesPromise: Promise<ScopeCollection> | undefined;
let namingAreasPromise: Promise<NamingAreaCollection> | undefined;

export async function loadNamingBoundaries() {
  scopesPromise ??= fetch("/assets/map/mc-scopes.geojson")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Nepavyko įkelti Lietuvos ribų.");
      }

      return (await response.json()) as ScopeCollection;
    })
    .catch((error: unknown) => {
      scopesPromise = undefined;
      throw error;
    });

  return scopesPromise;
}

function contains(feature: PolygonFeature, coordinates: Coordinates) {
  return booleanPointInPolygon(
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [coordinates.longitude, coordinates.latitude] },
    },
    feature as Parameters<typeof booleanPointInPolygon>[1],
  );
}

export async function isWithinLithuania(coordinates: Coordinates) {
  const boundaries = await loadNamingBoundaries();
  const lithuania = boundaries.features.find(
    (feature) => feature.properties.display_name === "Lietuva",
  );

  return lithuania ? contains(lithuania, coordinates) : false;
}

export async function loadNamingAreas() {
  namingAreasPromise ??= fetch("/assets/naming/lt-name-suggestor.v1.geojson")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Nepavyko įkelti vardų siūlymo ribų.");
      }

      return (await response.json()) as NamingAreaCollection;
    })
    .catch((error: unknown) => {
      namingAreasPromise = undefined;
      throw error;
    });

  return namingAreasPromise;
}

export type PrefixMatch = {
  code: NamingCode;
  displayName: string;
  featureType: "city" | "county";
  priority: number;
};

export async function findSuggestedPrefix(coordinates: Coordinates): Promise<PrefixMatch | null> {
  const areas = await loadNamingAreas();
  const matches = areas.features
    .filter((feature) => contains(feature, coordinates))
    .flatMap((feature) => {
      const code = feature.properties.suggested_code;
      const featureType = feature.properties.feature_type;
      const displayName = feature.properties.display_name;
      const priority = feature.properties.priority;
      return typeof code === "string" &&
        (featureType === "city" || featureType === "county") &&
        typeof displayName === "string" &&
        typeof priority === "number"
        ? [{ code, displayName, featureType: featureType as "city" | "county", priority }]
        : [];
    })
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.featureType.localeCompare(right.featureType) ||
        left.code.localeCompare(right.code),
    );

  return matches[0] ?? null;
}
