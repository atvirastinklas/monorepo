import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import { type NamingCode, namingScopes } from "./rules";

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

export type Coordinates = { latitude: number; longitude: number };

let scopesPromise: Promise<ScopeCollection> | undefined;

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

export async function findCountyCode(coordinates: Coordinates): Promise<NamingCode | null> {
  const boundaries = await loadNamingBoundaries();

  for (const scope of namingScopes) {
    const county = boundaries.features.find(
      (feature) => feature.properties.display_name === scope.county,
    );

    if (county && contains(county, coordinates)) {
      return scope.countyCode;
    }
  }

  return null;
}

export function findCodeFromAddress(
  address: Record<string, string | undefined>,
): NamingCode | null {
  const administrativeNames = [address.county, address.state_district, address.state]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());
  const scope = namingScopes.find((candidate) => administrativeNames.includes(candidate.county));
  if (!scope) {
    return null;
  }

  const cityName = scope.city.replace(" miestas", "");
  const localityNames = [address.city, address.town, address.municipality]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());
  return localityNames.some(
    (value) =>
      value === cityName || value === scope.city || value === `${cityName} miesto savivaldybė`,
  )
    ? scope.cityCode
    : scope.countyCode;
}
